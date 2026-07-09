# Worker-Service Hashtags & Hashtag Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let workers attach free-text hashtags to each service offering, show them on the public profile, and let clients search a hashtag (partial/contains) to get a deduped flat list of matching worker profiles.

**Architecture:** Store normalized `hashtags: string[]` directly on each `WorkerService` (Approach A — no shared Hashtag collection). Writes go through the existing worker-service upsert flow. A new aggregation on `WorkerService` powers a public `GET /api/workers/search-by-hashtag` endpoint returning paginated worker cards. The frontend adds a chip-input in the setup wizard, hashtag chips on the public profile, and a dedicated search page.

**Tech Stack:** Node + Express + TypeScript + Mongoose (backend, jest + ts-jest); Next.js 16 App Router + React 19 + TanStack Query + axios + shadcn/ui (frontend).

## Global Constraints

- Backend `tsconfig` is `strict` and enforces `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch` — no unused imports/params.
- HTTP responses go through the `R` helper (`utils/response`); errors via `AppError`. Request bodies/queries validated with Zod via `validateWithSchema`. All DB access in repositories.
- Hashtags stored normalized-only. Limits: **≤10 hashtags per service**, **≤50 chars per tag**.
- Normalization is the single source of truth server-side (`normalizeHashtags`), applied on every write; search normalizes the query the same way, then `escapeRegExp` before building a `$regex`.
- Search excludes deprecated services (`service.is_active`) and inactive/non-worker users (`status ACTIVE`, `roles` contains `WORKER`); results are **deduped by worker**.
- The `search-by-hashtag` route MUST be registered BEFORE the `/:id` route in `worker.routes.ts` (else `/:id` captures it).
- Frontend: no semicolons; `const` arrow functions with explicit types; Tailwind only; event handlers prefixed `handle*`; a11y attributes. Hooks in `lib/hooks/use-*.ts`; query keys in `lib/query-keys.ts`; axios in `services/*.ts`.
- The client app has no test runner; frontend tasks are verified with `npm run typecheck` (+ eslint on changed files) and manual checks.
- Conventional Commits.

---

## File Structure

**Backend (`SERVER/`):**
- `src/constants/worker-service.ts` — CREATE: `WORKER_SERVICE_HASHTAG_LIMITS`.
- `src/utils/worker-hashtag.ts` — CREATE: `normalizeHashtag`, `normalizeHashtags`.
- `src/utils/worker-hashtag.test.ts` — CREATE: unit tests.
- `src/types/worker/worker-service.ts` — MODIFY: `hashtags` on `IWorkerService`.
- `src/models/worker/worker-service.ts` — MODIFY: `hashtags` field + index.
- `src/repositories/worker/worker-service.repository.ts` — MODIFY: `UpsertWorkerServicePayload.hashtags`, write hashtags in upsert; new `searchWorkersByHashtag`.
- `src/validations/worker/worker-service.validation.ts` — MODIFY: `hashtags` on the create item.
- `src/services/worker/worker-service.service.ts` — MODIFY: normalize + pass hashtags on upsert.
- `src/services/worker/worker.service.ts` — MODIFY: include `hashtags` in `getWorkerProfile` services map; add `searchByHashtag`.
- `src/services/worker/worker.service.test.ts` — CREATE: search service tests.
- `src/types/worker/worker-hashtag-search.types.ts` — CREATE: `WorkerHashtagCard`.
- `src/validations/worker/worker-hashtag-search.validation.ts` — CREATE: query schema.
- `src/controllers/worker/worker.controller.ts` — MODIFY: `searchByHashtag` handler.
- `src/routes/worker/worker.routes.ts` — MODIFY: register the route before `/:id`.

**Frontend (`pr1as-client/`):**
- `types/index.ts` — MODIFY: `hashtags` on `WorkerServiceItem` + `WorkerServiceUpsertItem`; add `WorkerHashtagCard`.
- `services/worker-profile.service.ts` — MODIFY: upsert body carries `hashtags`.
- `services/worker.service.ts` — MODIFY: `searchByHashtag` client.
- `components/worker/hashtag-chip-input.tsx` — CREATE: reusable chip input.
- `app/worker/setup/page.tsx` — MODIFY: per-service hashtag state + chip input + payload.
- `components/worker/worker-services.tsx` — MODIFY: render hashtag chips.
- `lib/query-keys.ts` — MODIFY: `workers.hashtagSearch`.
- `lib/hooks/use-worker-hashtag-search.ts` — CREATE: search hook.
- `app/workers/search/page.tsx` — CREATE: search page (input + results).
- `components/worker/worker-hashtag-search-box.tsx` — CREATE: entry box.

---

## Task 1: Hashtag normalization helper + constants (TDD)

**Files:**
- Create: `SERVER/src/constants/worker-service.ts`
- Create: `SERVER/src/utils/worker-hashtag.ts`
- Create: `SERVER/src/utils/worker-hashtag.test.ts`

**Interfaces:**
- Produces:
  - `WORKER_SERVICE_HASHTAG_LIMITS = { MAX_PER_SERVICE: 10, MAX_LENGTH: 50 }`
  - `normalizeHashtag(raw: string): string | null`
  - `normalizeHashtags(raw: string[]): string[]`

- [ ] **Step 1: Write the failing test**

Create `SERVER/src/utils/worker-hashtag.test.ts`:

```typescript
import { normalizeHashtag, normalizeHashtags } from "./worker-hashtag";

describe("normalizeHashtag", () => {
  it("strips a leading #, lowercases, and trims", () => {
    expect(normalizeHashtag("  #IT ")).toBe("it");
  });

  it("converts spaces and hyphens to a single underscore", () => {
    expect(normalizeHashtag("IT  support")).toBe("it_support");
    expect(normalizeHashtag("front-end")).toBe("front_end");
  });

  it("drops disallowed characters and trims underscores", () => {
    expect(normalizeHashtag("__C#/++__")).toBe("c");
  });

  it("keeps unicode letters and digits", () => {
    expect(normalizeHashtag("Kế_toán2")).toBe("kế_toán2");
  });

  it("returns null for empty-after-cleaning input", () => {
    expect(normalizeHashtag("  ###  ")).toBeNull();
    expect(normalizeHashtag("")).toBeNull();
  });

  it("returns null when longer than MAX_LENGTH (50)", () => {
    expect(normalizeHashtag("a".repeat(51))).toBeNull();
    expect(normalizeHashtag("a".repeat(50))).toBe("a".repeat(50));
  });
});

describe("normalizeHashtags", () => {
  it("normalizes, drops nulls, and dedupes preserving order", () => {
    expect(normalizeHashtags(["IT", "#it", "HR", " hr "])).toEqual([
      "it",
      "hr",
    ]);
  });

  it("caps the result at MAX_PER_SERVICE (10)", () => {
    const input = Array.from({ length: 15 }, (_, i) => `tag${i}`);
    expect(normalizeHashtags(input)).toHaveLength(10);
  });

  it("returns an empty array for empty input", () => {
    expect(normalizeHashtags([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd SERVER && npx jest src/utils/worker-hashtag.test.ts`
Expected: FAIL — cannot find module `./worker-hashtag`.

- [ ] **Step 3: Write the constants**

Create `SERVER/src/constants/worker-service.ts`:

```typescript
export const WORKER_SERVICE_HASHTAG_LIMITS = {
  MAX_PER_SERVICE: 10,
  MAX_LENGTH: 50,
} as const;
```

- [ ] **Step 4: Write the implementation**

Create `SERVER/src/utils/worker-hashtag.ts`:

```typescript
import { WORKER_SERVICE_HASHTAG_LIMITS } from "../constants/worker-service";

export const normalizeHashtag = (raw: string): string | null => {
  const cleaned = raw
    .trim()
    .replace(/^#+/, "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^\p{L}\p{N}_]/gu, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!cleaned) {
    return null;
  }
  if (cleaned.length > WORKER_SERVICE_HASHTAG_LIMITS.MAX_LENGTH) {
    return null;
  }
  return cleaned;
};

export const normalizeHashtags = (raw: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of raw) {
    const normalized = normalizeHashtag(item);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= WORKER_SERVICE_HASHTAG_LIMITS.MAX_PER_SERVICE) {
      break;
    }
  }

  return result;
};
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd SERVER && npx jest src/utils/worker-hashtag.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
cd SERVER && git add src/constants/worker-service.ts src/utils/worker-hashtag.ts src/utils/worker-hashtag.test.ts
git commit -m "feat(worker): add worker-service hashtag normalization helper"
```

---

## Task 2: WorkerService model + type — `hashtags` field

**Files:**
- Modify: `SERVER/src/types/worker/worker-service.ts`
- Modify: `SERVER/src/models/worker/worker-service.ts`

**Interfaces:**
- Produces: `IWorkerService.hashtags: string[]`; multikey index on `hashtags`.

- [ ] **Step 1: Add the field to the type**

In `SERVER/src/types/worker/worker-service.ts`, add `hashtags` to `IWorkerService` (after `pricing`):

```typescript
export interface IWorkerService {
  worker_id: Types.ObjectId;
  service_id: Types.ObjectId;
  service_code: string;
  pricing: WorkerServicePricing[];
  hashtags: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

- [ ] **Step 2: Add the field + index to the schema**

In `SERVER/src/models/worker/worker-service.ts`, add the `hashtags` field to `workerServiceSchema` right after the `pricing` block (before `is_active`):

```typescript
    hashtags: {
      type: [String],
      default: [],
    },
```

And add this index after the schema definition (near the bottom, before `export const WorkerService`):

```typescript
workerServiceSchema.index({ hashtags: 1 });
```

- [ ] **Step 3: Verify the build compiles**

Run: `cd SERVER && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd SERVER && git add src/types/worker/worker-service.ts src/models/worker/worker-service.ts
git commit -m "feat(worker): add hashtags field to WorkerService model"
```

---

## Task 3: Persist hashtags through the upsert flow

**Files:**
- Modify: `SERVER/src/repositories/worker/worker-service.repository.ts`
- Modify: `SERVER/src/validations/worker/worker-service.validation.ts`
- Modify: `SERVER/src/services/worker/worker-service.service.ts`

**Interfaces:**
- Consumes: `normalizeHashtags` (Task 1), `IWorkerService.hashtags` (Task 2).
- Produces: `UpsertWorkerServicePayload.hashtags: string[]`; the create body accepts `hashtags?: string[]`.

- [ ] **Step 1: Add `hashtags` to the upsert payload + write it**

In `SERVER/src/repositories/worker/worker-service.repository.ts`, extend the interface (near the top, the `UpsertWorkerServicePayload` definition):

```typescript
export interface UpsertWorkerServicePayload {
  serviceId: string;
  serviceCode: string;
  pricing: WorkerServicePricing[];
  hashtags: string[];
}
```

In the same file, inside `upsertManyForWorker`'s `$set` block, add `hashtags`:

```typescript
              $set: {
                service_id: serviceObjectId,
                service_code: item.serviceCode,
                pricing: item.pricing,
                hashtags: item.hashtags,
                is_active: true,
                updated_at: now,
              },
```

- [ ] **Step 2: Accept `hashtags` in the create validation**

In `SERVER/src/validations/worker/worker-service.validation.ts`, add the import and extend the `services` item object. Add at the top with the other imports:

```typescript
import { WORKER_SERVICE_HASHTAG_LIMITS } from "../../constants/worker-service";
```

Change the `createWorkerServicesSchema` item object to include `hashtags`:

```typescript
export const createWorkerServicesSchema = z
  .object({
    services: z
      .array(
        z
          .object({
            service_id: objectIdSchema,
            pricing: z
              .array(pricingSchema)
              .min(1, { message: "pricing must contain at least 1 item" }),
            hashtags: z
              .array(z.string())
              .max(WORKER_SERVICE_HASHTAG_LIMITS.MAX_PER_SERVICE, {
                message: `hashtags cannot exceed ${WORKER_SERVICE_HASHTAG_LIMITS.MAX_PER_SERVICE} items`,
              })
              .optional(),
          })
          .strict()
      )
      .min(1, { message: "services must contain at least 1 item" })
      .max(20, { message: "services cannot exceed 20 items" }),
  })
  .strict();
```

- [ ] **Step 3: Normalize + pass hashtags in the service layer**

In `SERVER/src/services/worker/worker-service.service.ts`, add the import:

```typescript
import { normalizeHashtags } from "../../utils/worker-hashtag";
```

Then in `createWorkerServices`, extend the `upsertPayloads` mapping to include normalized hashtags. Change the mapped object to:

```typescript
      return {
        serviceId: item.service_id,
        serviceCode: service.code,
        pricing: this.normalizePricing(item.pricing, index),
        hashtags: normalizeHashtags(item.hashtags ?? []),
      };
```

(`item.hashtags` comes from the validated body; `CreateWorkerServicesBody` now types it as `string[] | undefined`.)

- [ ] **Step 4: Verify the build compiles**

Run: `cd SERVER && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manually verify the write path**

Run the dev server; as a worker, POST `/api/worker/services` with one service carrying `hashtags: ["IT", "#it", "HR"]` and confirm the stored document has `hashtags: ["it","hr"]` (deduped/normalized). (A full integration test needs a DB; the normalization itself is covered by Task 1.)

```bash
cd SERVER && npm run dev
# then POST as a worker (replace token/service_id):
# curl -X POST http://localhost:3000/api/worker/services -H "Authorization: Bearer <T>" -H "Content-Type: application/json" \
#   -d '{"services":[{"service_id":"<SID>","pricing":[{"unit":"HOURLY","duration":1,"price":100000,"currency":"VND"}],"hashtags":["IT","#it","HR"]}]}'
```

Expected: response `services[0].hashtags` = `["it","hr"]`.

- [ ] **Step 6: Commit**

```bash
cd SERVER && git add src/repositories/worker/worker-service.repository.ts src/validations/worker/worker-service.validation.ts src/services/worker/worker-service.service.ts
git commit -m "feat(worker): persist normalized hashtags on service upsert"
```

---

## Task 4: Expose hashtags on profile reads

**Files:**
- Modify: `SERVER/src/services/worker/worker.service.ts`

**Interfaces:**
- Consumes: `IWorkerService.hashtags` (Task 2).
- Produces: `getWorkerProfile` services each include `hashtags: string[]`. (`getWorkerServices` / `/worker/services` already returns hashtags via the model `toJSON` once Task 2 lands — no change needed there.)

- [ ] **Step 1: Add `hashtags` to the profile services map**

In `SERVER/src/services/worker/worker.service.ts`, in `getWorkerProfile`, extend the `services` mapping (currently `_id`, `service_id`, `service_code`, `pricing`) to include hashtags:

```typescript
    const services = workerServices.map((ws) => ({
      _id: ws._id.toString(),
      service_id: ws.service_id.toString(),
      service_code: ws.service_code,
      hashtags: ws.hashtags ?? [],
      pricing: ws.pricing.map((p) => ({
        unit: p.unit,
        duration: p.duration,
        price: p.price,
        currency: p.currency,
```

(Leave the rest of the pricing map unchanged; only add the `hashtags` line above the `pricing:` key.)

- [ ] **Step 2: Verify the build compiles**

Run: `cd SERVER && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd SERVER && git add src/services/worker/worker.service.ts
git commit -m "feat(worker): include hashtags in worker profile services"
```

---

## Task 5: Search repository aggregation

**Files:**
- Create: `SERVER/src/types/worker/worker-hashtag-search.types.ts`
- Modify: `SERVER/src/repositories/worker/worker-service.repository.ts`

**Interfaces:**
- Consumes: `escapeRegExp` (`utils/string`), `UserStatus`/`UserRole` (`types/auth`), `ServiceCategory`/`modelsName`.
- Produces:
  - `WorkerHashtagCard` (type).
  - `workerServiceRepository.searchWorkersByHashtag(normalizedQuery: string, skip: number, limit: number): Promise<{ data: WorkerHashtagCard[]; total: number }>`.

- [ ] **Step 1: Define the result type**

Create `SERVER/src/types/worker/worker-hashtag-search.types.ts`:

```typescript
export interface WorkerHashtagCard {
  id: string;
  full_name: string | null;
  avatar: string | null;
  worker_profile: {
    introduction: string | null;
    gallery_urls: string[];
    work_locations: Array<{
      province_code: number;
      ward_code: number | null;
      label_snapshot: string | null;
    }>;
  } | null;
  reputation_score: number;
  matched_hashtags: string[];
}
```

- [ ] **Step 2: Add the aggregation method**

In `SERVER/src/repositories/worker/worker-service.repository.ts`, add the import for the type at the top:

```typescript
import { WorkerHashtagCard } from "../../types/worker/worker-hashtag-search.types";
```

Confirm these are already imported in this file (they are, used elsewhere): `mongoose`, `PipelineStage`, `modelsName`, `UserStatus`. Add `UserRole` to the existing `../../types/auth` import if not present.

Add this method inside the `WorkerServiceRepository` class:

```typescript
  async searchWorkersByHashtag(
    normalizedQuery: string,
    skip: number,
    limit: number
  ): Promise<{ data: WorkerHashtagCard[]; total: number }> {
    const regex = new RegExp(escapeRegExp(normalizedQuery), "i");

    const pipeline: PipelineStage[] = [
      { $match: { is_active: true, hashtags: { $regex: regex } } },
      {
        $lookup: {
          from: modelsName.SERVICE,
          localField: "service_id",
          foreignField: "_id",
          as: "service",
        },
      },
      { $unwind: { path: "$service", preserveNullAndEmptyArrays: false } },
      { $match: { "service.is_active": true } },
      {
        $lookup: {
          from: modelsName.USER,
          localField: "worker_id",
          foreignField: "_id",
          as: "worker",
        },
      },
      { $unwind: { path: "$worker", preserveNullAndEmptyArrays: false } },
      {
        $match: {
          "worker.status": UserStatus.ACTIVE,
          "worker.roles": UserRole.WORKER,
        },
      },
      {
        $group: {
          _id: "$worker_id",
          worker: { $first: "$worker" },
          reputation_score: { $first: "$worker.reputation_score" },
          all_hashtags: { $push: "$hashtags" },
        },
      },
      {
        $project: {
          _id: 0,
          id: { $toString: "$_id" },
          full_name: { $ifNull: ["$worker.full_name", null] },
          avatar: { $ifNull: ["$worker.avatar", null] },
          worker_profile: {
            introduction: {
              $ifNull: ["$worker.worker_profile.introduction", null],
            },
            gallery_urls: {
              $ifNull: ["$worker.worker_profile.gallery_urls", []],
            },
            work_locations: {
              $ifNull: ["$worker.worker_profile.work_locations", []],
            },
          },
          reputation_score: { $ifNull: ["$reputation_score", 100] },
          matched_hashtags: {
            $filter: {
              input: {
                $setUnion: [
                  {
                    $reduce: {
                      input: "$all_hashtags",
                      initialValue: [],
                      in: { $concatArrays: ["$$value", "$$this"] },
                    },
                  },
                  [],
                ],
              },
              as: "tag",
              cond: { $regexMatch: { input: "$$tag", regex } },
            },
          },
        },
      },
      { $sort: { reputation_score: -1, id: 1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await WorkerService.aggregate(pipeline);
    const data = (result?.data ?? []) as WorkerHashtagCard[];
    const total = result?.totalCount?.[0]?.count ?? 0;
    return { data, total };
  }
```

Confirm `escapeRegExp` is imported in this file; if not, add:

```typescript
import { escapeRegExp } from "../../utils/string";
```

- [ ] **Step 3: Verify the build compiles**

Run: `cd SERVER && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd SERVER && git add src/types/worker/worker-hashtag-search.types.ts src/repositories/worker/worker-service.repository.ts
git commit -m "feat(worker): add hashtag search aggregation on WorkerService"
```

---

## Task 6: Search service + controller + route + validation (TDD)

**Files:**
- Create: `SERVER/src/validations/worker/worker-hashtag-search.validation.ts`
- Modify: `SERVER/src/services/worker/worker.service.ts`
- Create: `SERVER/src/services/worker/worker.service.test.ts`
- Modify: `SERVER/src/controllers/worker/worker.controller.ts`
- Modify: `SERVER/src/routes/worker/worker.routes.ts`

**Interfaces:**
- Consumes: `normalizeHashtag` (Task 1), `searchWorkersByHashtag` (Task 5), `getPagination`/`PaginationHelper` (`utils/pagination`).
- Produces: `workerService.searchByHashtag(rawQuery: string, page?: number, limit?: number): Promise<PaginatedResponse<WorkerHashtagCard>>`; `GET /api/workers/search-by-hashtag`.

- [ ] **Step 1: Write the failing test**

Create `SERVER/src/services/worker/worker.service.test.ts`:

```typescript
jest.mock("../../repositories/worker/worker-service.repository", () => ({
  workerServiceRepository: {
    searchWorkersByHashtag: jest.fn(),
  },
}));

import { workerService } from "./worker.service";
import { workerServiceRepository } from "../../repositories/worker/worker-service.repository";

describe("workerService.searchByHashtag", () => {
  beforeEach(() => jest.clearAllMocks());

  it("normalizes the query and passes skip/limit, returning paginated cards", async () => {
    (workerServiceRepository.searchWorkersByHashtag as jest.Mock).mockResolvedValue(
      { data: [{ id: "w1", matched_hashtags: ["it"] }], total: 1 }
    );

    const result = await workerService.searchByHashtag("#IT", 1, 20);

    expect(workerServiceRepository.searchWorkersByHashtag).toHaveBeenCalledWith(
      "it",
      0,
      20
    );
    expect(result.data).toHaveLength(1);
    expect(result.pagination).toMatchObject({ page: 1, limit: 20, total: 1 });
  });

  it("returns an empty page without hitting the repo when the query normalizes to empty", async () => {
    const result = await workerService.searchByHashtag("###", 1, 20);

    expect(
      workerServiceRepository.searchWorkersByHashtag
    ).not.toHaveBeenCalled();
    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd SERVER && npx jest src/services/worker/worker.service.test.ts`
Expected: FAIL — `workerService.searchByHashtag` is not a function.

- [ ] **Step 3: Implement the service method**

In `SERVER/src/services/worker/worker.service.ts`, add imports (if not already present):

```typescript
import { normalizeHashtag } from "../../utils/worker-hashtag";
import {
  getPagination,
  PaginationHelper,
  PaginatedResponse,
} from "../../utils/pagination";
import { WorkerHashtagCard } from "../../types/worker/worker-hashtag-search.types";
```

Add this method to the `WorkerService` class (the service class in this file):

```typescript
  async searchByHashtag(
    rawQuery: string,
    page?: number,
    limit?: number
  ): Promise<PaginatedResponse<WorkerHashtagCard>> {
    const pagination = getPagination(page, limit);
    const normalized = normalizeHashtag(rawQuery);

    if (!normalized) {
      return PaginationHelper.formatResponse(
        [],
        pagination.page,
        pagination.limit,
        0
      );
    }

    const { data, total } =
      await workerServiceRepository.searchWorkersByHashtag(
        normalized,
        pagination.skip,
        pagination.limit
      );

    return PaginationHelper.formatResponse(
      data,
      pagination.page,
      pagination.limit,
      total
    );
  }
```

Confirm `workerServiceRepository` is already imported in this file (it is, used by `getWorkerProfile`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd SERVER && npx jest src/services/worker/worker.service.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Add the query validation schema**

Create `SERVER/src/validations/worker/worker-hashtag-search.validation.ts`:

```typescript
import { z } from "zod";

const positiveIntFromString = z.preprocess((val) => {
  if (typeof val === "string" && val.trim() !== "") {
    const parsed = Number(val);
    return Number.isNaN(parsed) ? val : parsed;
  }
  return val;
}, z.number().int().positive().optional());

export const workerHashtagSearchQuerySchema = z.object({
  q: z
    .string({ required_error: "q is required" })
    .trim()
    .min(1, { message: "q must not be empty" }),
  page: positiveIntFromString,
  limit: positiveIntFromString,
});

export type WorkerHashtagSearchQuery = z.infer<
  typeof workerHashtagSearchQuerySchema
>;
```

- [ ] **Step 6: Add the controller handler**

In `SERVER/src/controllers/worker/worker.controller.ts`, the controller already imports `{ R, extractUserIdFromRequest } from "../../utils"` and `{ Request, Response } from "express"`. Add `validateWithSchema` to the **existing** `../../utils` import (do not add a second import line from the same module):

```typescript
import { R, extractUserIdFromRequest, validateWithSchema } from "../../utils";
```

Then add the schema + messages imports (add `COMMON_MESSAGES` only if not already imported in this file):

```typescript
import { workerHashtagSearchQuerySchema } from "../../validations/worker/worker-hashtag-search.validation";
import { COMMON_MESSAGES } from "../../constants/messages";
```

Add this method to the controller class:

```typescript
  async searchByHashtag(req: Request, res: Response): Promise<void> {
    const query = validateWithSchema(
      workerHashtagSearchQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await workerService.searchByHashtag(
      query.q,
      query.page,
      query.limit
    );
    R.success(res, result);
  }
```

Confirm `Request`/`Response` from express, `R`, and `workerService` are already imported in this controller (they are).

- [ ] **Step 7: Register the route BEFORE `/:id`**

In `SERVER/src/routes/worker/worker.routes.ts`, add this block immediately BEFORE the `router.get("/:id", ...)` block (order matters — `/:id` is a catch-all):

```typescript
router.get(
  "/search-by-hashtag",
  asyncHandler(workerController.searchByHashtag.bind(workerController))
);
```

- [ ] **Step 8: Verify build + smoke-test the endpoint**

Run: `cd SERVER && npx tsc --noEmit` (expected: clean). Then:

```bash
cd SERVER && npm run dev
# curl 'http://localhost:3000/api/workers/search-by-hashtag?q=it&page=1&limit=20'
```

Expected: `{ "success": true, "data": { "data": [...], "pagination": { "page":1, "limit":20, "total":N, ... } } }`. `q=` (empty) → 400.

- [ ] **Step 9: Commit**

```bash
cd SERVER && git add src/validations/worker/worker-hashtag-search.validation.ts src/services/worker/worker.service.ts src/services/worker/worker.service.test.ts src/controllers/worker/worker.controller.ts src/routes/worker/worker.routes.ts
git commit -m "feat(worker): expose hashtag search endpoint"
```

---

## Task 7: Frontend types + upsert client carry hashtags

**Files:**
- Modify: `pr1as-client/types/index.ts`
- Modify: `pr1as-client/services/worker-profile.service.ts`

**Interfaces:**
- Produces: `WorkerServiceItem.hashtags`, `WorkerServiceUpsertItem.hashtags`, `WorkerHashtagCard` (FE); upsert body carries `hashtags`.

- [ ] **Step 1: Add hashtags to the FE types**

In `pr1as-client/types/index.ts`, add `hashtags` to `WorkerServiceUpsertItem`:

```typescript
export type WorkerServiceUpsertItem = {
  service_id: string
  pricing: WorkerPricingSlot[]
  hashtags: string[]
}
```

And to `WorkerServiceItem`:

```typescript
export type WorkerServiceItem = {
  _id: string
  service_id: string
  service_code: string
  pricing: WorkerServicePricing[]
  hashtags: string[]
  is_active: boolean
}
```

And add a new type near `WorkerServiceItem`:

```typescript
export type WorkerHashtagCard = {
  id: string
  full_name: string | null
  avatar: string | null
  worker_profile: {
    introduction: string | null
    gallery_urls: string[]
    work_locations: Array<{
      province_code: number
      ward_code: number | null
      label_snapshot: string | null
    }>
  } | null
  reputation_score: number
  matched_hashtags: string[]
}
```

- [ ] **Step 2: Send hashtags in the upsert body**

In `pr1as-client/services/worker-profile.service.ts`, in `upsertWorkerServices`, add `hashtags` to the mapped service item:

```typescript
      services: payload.services.map((s) => ({
        service_id: s.service_id,
        hashtags: s.hashtags,
        pricing: s.pricing.map((p) => ({
          unit: p.unit,
          duration: p.duration,
          price: p.price,
          currency: (p.currency ?? "VND").slice(0, 3),
        })),
      })),
```

- [ ] **Step 3: Verify types compile**

Run: `cd pr1as-client && npm run typecheck`
Expected: fails ONLY where `buildServicesPayload` builds items without `hashtags` (fixed in Task 9). If it fails elsewhere, fix minimally. Note: it is acceptable for this task to leave a known type error at the `buildServicesPayload` call site that Task 9 resolves; if you prefer a green build, do Task 9 in the same commit. To keep tasks independent, add `hashtags: []` as a temporary default at the single `items.push({...})` site in `app/worker/setup/page.tsx` now, and replace it with real state in Task 9.

- [ ] **Step 4: Apply the temporary default so the build is green**

In `pr1as-client/app/worker/setup/page.tsx`, in `buildServicesPayload`, add `hashtags: []` to the `items.push({ ... })` object (temporary; Task 9 wires real values):

```typescript
      items.push({
        service_id: serviceId,
        hashtags: [],
        pricing: norm.map((p) => {
```

- [ ] **Step 5: Verify types compile (green)**

Run: `cd pr1as-client && npm run typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd pr1as-client && git add types/index.ts services/worker-profile.service.ts app/worker/setup/page.tsx
git commit -m "feat(worker): add hashtags to worker service FE types and upsert body"
```

---

## Task 8: HashtagChipInput component

**Files:**
- Create: `pr1as-client/components/worker/hashtag-chip-input.tsx`

**Interfaces:**
- Produces: `HashtagChipInput` with props `{ value: string[]; onChange: (next: string[]) => void; max?: number; placeholder?: string; disabled?: boolean }`.

- [ ] **Step 1: Build the component**

Create `pr1as-client/components/worker/hashtag-chip-input.tsx`. Adjust `@/components/ui/*` paths only if a primitive lives elsewhere.

```typescript
"use client"

import { useState, type KeyboardEvent } from "react"
import { X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

type HashtagChipInputProps = {
  value: string[]
  onChange: (next: string[]) => void
  max?: number
  placeholder?: string
  disabled?: boolean
}

const DEFAULT_MAX = 10

// Mirror the server's normalization closely enough for a good preview; the
// server re-normalizes on save, so this only needs to be sensible.
const normalize = (raw: string): string =>
  raw
    .trim()
    .replace(/^#+/, "")
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^\p{L}\p{N}_]/gu, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")

export const HashtagChipInput = ({
  value,
  onChange,
  max = DEFAULT_MAX,
  placeholder,
  disabled,
}: HashtagChipInputProps) => {
  const [draft, setDraft] = useState("")

  const addTag = () => {
    const tag = normalize(draft)
    setDraft("")
    if (!tag || value.includes(tag) || value.length >= max) return
    onChange([...value, tag])
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault()
      addTag()
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const handleRemove = (tag: string) => {
    onChange(value.filter((item) => item !== tag))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            #{tag}
            <button
              type="button"
              aria-label={`Xóa hashtag ${tag}`}
              onClick={() => handleRemove(tag)}
              disabled={disabled}
              className="rounded-full hover:text-destructive"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        disabled={disabled || value.length >= max}
        placeholder={
          value.length >= max
            ? `Tối đa ${max} hashtag`
            : (placeholder ?? "Nhập hashtag rồi Enter (vd: IT, HR)")
        }
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd pr1as-client && npm run typecheck`
Expected: no errors. (Confirm `@/components/ui/badge` exports `Badge` and `@/components/ui/input` exports `Input` — both exist.)

- [ ] **Step 3: Commit**

```bash
cd pr1as-client && git add components/worker/hashtag-chip-input.tsx
git commit -m "feat(worker): add reusable hashtag chip input"
```

---

## Task 9: Wire per-service hashtags into the setup wizard

**Files:**
- Modify: `pr1as-client/app/worker/setup/page.tsx`

**Interfaces:**
- Consumes: `HashtagChipInput` (Task 8), `WorkerServiceItem.hashtags` (Task 7).

- [ ] **Step 1: Add hashtag state, seeded from existing services**

In `pr1as-client/app/worker/setup/page.tsx`, add the import:

```typescript
import { HashtagChipInput } from "@/components/worker/hashtag-chip-input"
```

Add a state map next to `selectedPricing` (after the `const [selectedPricing, setSelectedPricing] = useState<Map<string, WorkerPricingSlot[]>>(...)` declaration):

```typescript
  const [serviceHashtags, setServiceHashtags] = useState<
    Map<string, string[]>
  >(new Map())
```

In the effect that seeds `selectedPricing` from `mineQuery.data` (the block that builds `nextMap` from `const mine = mineQuery.data ?? []`), also build and set a hashtag map. Immediately after `setSelectedPricing(nextMap)`, add:

```typescript
    const nextHashtags = new Map<string, string[]>()
    for (const ws of mine) {
      nextHashtags.set(ws.service_id, ws.hashtags ?? [])
    }
    setServiceHashtags(nextHashtags)
```

- [ ] **Step 2: Add an updater and render the chip input per service**

Add a handler near the other service handlers:

```typescript
  const handleServiceHashtagsChange = (serviceId: string, next: string[]) => {
    setServiceHashtags((prev) => {
      const updated = new Map(prev)
      updated.set(serviceId, next)
      return updated
    })
  }
```

In the per-service render block (where a selected service shows its pricing UI — near the `const checked = selectedPricing.has(service.id)` logic), render the chip input for checked services. Add, inside the service row markup where pricing inputs appear (only when `checked` is true):

```tsx
{checked ? (
  <div className="mt-2 space-y-1">
    <p className="text-xs font-medium text-muted-foreground">
      Hashtag (giúp khách tìm theo từ khoá)
    </p>
    <HashtagChipInput
      value={serviceHashtags.get(service.id) ?? []}
      onChange={(next) => handleServiceHashtagsChange(service.id, next)}
    />
  </div>
) : null}
```

(Place this just below the pricing inputs block for the service; match the surrounding JSX structure and indentation.)

- [ ] **Step 3: Send real hashtags in the payload**

In `buildServicesPayload`, replace the temporary `hashtags: []` (added in Task 7) with the state value:

```typescript
      items.push({
        service_id: serviceId,
        hashtags: serviceHashtags.get(serviceId) ?? [],
        pricing: norm.map((p) => {
```

- [ ] **Step 4: Verify types compile + lint**

Run: `cd pr1as-client && npm run typecheck && npx eslint app/worker/setup/page.tsx`
Expected: typecheck clean; no new eslint errors.

- [ ] **Step 5: Manually verify in the browser**

Run the client + backend. As a worker, open `/worker/setup`, reach the services step, add hashtags to a selected service, save, reload — the hashtags persist and prefill.

- [ ] **Step 6: Commit**

```bash
cd pr1as-client && git add app/worker/setup/page.tsx
git commit -m "feat(worker): add per-service hashtag input to setup wizard"
```

---

## Task 10: Show hashtags on the public profile

**Files:**
- Modify: `pr1as-client/components/worker/worker-services.tsx`

**Interfaces:**
- Consumes: `WorkerServiceItem.hashtags` (Task 7).

- [ ] **Step 1: Render hashtag chips under each service**

In `pr1as-client/components/worker/worker-services.tsx`, inside the `activeServices.map((service) => { ... })` render, add hashtag chips below the price line. Locate the block:

```tsx
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatPrice(cheapest, t, format)}
                    </p>
```

Add immediately after that `<p>`:

```tsx
                    {service.hashtags.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {service.hashtags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
```

- [ ] **Step 2: Verify types compile**

Run: `cd pr1as-client && npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Manually verify**

Open a worker profile that has hashtags on a service; the chips render under the price.

- [ ] **Step 4: Commit**

```bash
cd pr1as-client && git add components/worker/worker-services.tsx
git commit -m "feat(worker): show service hashtags on public profile"
```

---

## Task 11: Hashtag search — client, hook, query key, page

**Files:**
- Modify: `pr1as-client/services/worker.service.ts`
- Modify: `pr1as-client/lib/query-keys.ts`
- Create: `pr1as-client/lib/hooks/use-worker-hashtag-search.ts`
- Create: `pr1as-client/app/workers/search/page.tsx`

**Interfaces:**
- Consumes: `WorkerHashtagCard` (Task 7), `GET /api/workers/search-by-hashtag` (Task 6).
- Produces: `workerServiceSearch.searchByHashtag(q, page)`; `useWorkerHashtagSearch(q, page)`; `queryKeys.workers.hashtagSearch(q, page)`.

- [ ] **Step 1: Add the API client method**

In `pr1as-client/services/worker.service.ts`, add (reuse the file's existing `api` import and response typing patterns):

```typescript
import type { WorkerHashtagCard } from "@/types"

type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type WorkerHashtagSearchResult = {
  data: WorkerHashtagCard[]
  pagination: PaginationMeta
}

export const searchWorkersByHashtag = async (
  q: string,
  page = 1,
  limit = 20
): Promise<WorkerHashtagSearchResult> => {
  const response = await api.get<{ data?: WorkerHashtagSearchResult }>(
    "/workers/search-by-hashtag",
    { params: { q, page, limit } }
  )
  return (
    response.data.data ?? {
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      },
    }
  )
}
```

(If `worker.service.ts` exports a single object rather than named functions, add `searchWorkersByHashtag` to that object following the file's existing style. Confirm `WorkerHashtagCard` is exported from `@/types` — Task 7.)

- [ ] **Step 2: Add the query key**

In `pr1as-client/lib/query-keys.ts`, add to the `workers` group:

```typescript
    hashtagSearch: (q: string, page: number) =>
      ["workers", "hashtag-search", q, page] as const,
```

- [ ] **Step 3: Create the hook**

Create `pr1as-client/lib/hooks/use-worker-hashtag-search.ts`:

```typescript
"use client"

import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import { searchWorkersByHashtag } from "@/services/worker.service"

export const useWorkerHashtagSearch = (q: string, page = 1) => {
  const trimmed = q.trim()
  return useQuery({
    queryKey: queryKeys.workers.hashtagSearch(trimmed, page),
    queryFn: () => searchWorkersByHashtag(trimmed, page),
    enabled: trimmed.length > 0,
  })
}
```

- [ ] **Step 4: Create the search page**

Create `pr1as-client/app/workers/search/page.tsx`:

```typescript
"use client"

import { useState, type ChangeEvent } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { useWorkerHashtagSearch } from "@/lib/hooks/use-worker-hashtag-search"

const WorkerHashtagSearchPage = () => {
  const [q, setQ] = useState("")
  const { data, isLoading, isFetching } = useWorkerHashtagSearch(q)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQ(event.target.value)
  }

  const results = data?.data ?? []
  const hasQuery = q.trim().length > 0

  return (
    <section className="mx-auto max-w-3xl space-y-6 p-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Tìm worker theo hashtag</h1>
        <Input
          value={q}
          onChange={handleChange}
          placeholder="Nhập hashtag (vd: it, hr)..."
          aria-label="Tìm theo hashtag"
        />
      </header>

      {hasQuery && (isLoading || isFetching) ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin" aria-label="Đang tải" />
        </div>
      ) : null}

      {hasQuery && !isLoading && results.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Không tìm thấy worker nào với hashtag này.
        </p>
      ) : null}

      <ul className="space-y-3">
        {results.map((worker) => (
          <li key={worker.id}>
            <Link
              href={`/workers/${worker.id}`}
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              {worker.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={worker.avatar}
                  alt={worker.full_name ?? "Worker"}
                  className="size-12 rounded-full object-cover"
                />
              ) : (
                <div className="size-12 rounded-full bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {worker.full_name ?? "Worker"}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {worker.matched_hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default WorkerHashtagSearchPage
```

(Confirm the public worker profile route is `/workers/:id`; if the app uses a different worker profile path, update the `href`. Verify against an existing profile link in the codebase.)

- [ ] **Step 5: Verify types compile + lint**

Run: `cd pr1as-client && npm run typecheck && npx eslint app/workers/search/page.tsx lib/hooks/use-worker-hashtag-search.ts`
Expected: typecheck clean; no eslint errors.

- [ ] **Step 6: Manually verify**

Run client + backend. Open `/workers/search`, type `it`, and confirm matching workers appear with their matched hashtags; clicking a card opens the profile.

- [ ] **Step 7: Commit**

```bash
cd pr1as-client && git add services/worker.service.ts lib/query-keys.ts lib/hooks/use-worker-hashtag-search.ts app/workers/search/page.tsx
git commit -m "feat(worker): add hashtag search page, hook, and client"
```

---

## Task 12: Discovery entry point (search box)

**Files:**
- Create: `pr1as-client/components/worker/worker-hashtag-search-box.tsx`
- Modify: `pr1as-client/components/home/home-search-experience.tsx`

**Interfaces:**
- Consumes: Next router (`next/navigation`).

- [ ] **Step 1: Build the entry box**

Create `pr1as-client/components/worker/worker-hashtag-search-box.tsx`:

```typescript
"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export const WorkerHashtagSearchBox = () => {
  const router = useRouter()
  const [q, setQ] = useState("")

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = q.trim()
    if (!trimmed) return
    router.push(`/workers/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="Tìm worker theo hashtag (vd: it, hr)..."
        aria-label="Tìm worker theo hashtag"
      />
      <Button type="submit" size="icon" aria-label="Tìm">
        <Search className="size-4" aria-hidden="true" />
      </Button>
    </form>
  )
}
```

To make the box deep-link correctly, update Task 11's search page to seed `q` from the `?q=` param: change its `useState("")` to read the initial value via `useSearchParams`:

```typescript
import { useSearchParams } from "next/navigation"
// inside the component, before useState:
const searchParams = useSearchParams()
const [q, setQ] = useState(searchParams.get("q") ?? "")
```

- [ ] **Step 2: Render the box in the discovery surface**

In `pr1as-client/components/home/home-search-experience.tsx`, import and render `WorkerHashtagSearchBox` near the top of the discovery UI (above the service/category tabs). Add:

```typescript
import { WorkerHashtagSearchBox } from "@/components/worker/worker-hashtag-search-box"
```

Place `<WorkerHashtagSearchBox />` at the top of the component's returned JSX (find a sensible container above the existing tabs/filters; keep the existing layout intact).

- [ ] **Step 3: Verify types compile + lint**

Run: `cd pr1as-client && npm run typecheck && npx eslint components/worker/worker-hashtag-search-box.tsx components/home/home-search-experience.tsx app/workers/search/page.tsx`
Expected: typecheck clean; no new eslint errors.

- [ ] **Step 4: Manually verify**

On the home/discovery page, type a hashtag in the box, submit, and confirm it navigates to `/workers/search?q=...` with the field pre-filled and results shown.

- [ ] **Step 5: Commit**

```bash
cd pr1as-client && git add components/worker/worker-hashtag-search-box.tsx components/home/home-search-experience.tsx app/workers/search/page.tsx
git commit -m "feat(worker): add hashtag search entry box on discovery"
```

---

## Final verification

- [ ] **Backend suite + typecheck**

Run: `cd SERVER && npx jest && npx tsc --noEmit`
Expected: all tests pass (worker-hashtag + worker.service search tests included); no type errors.

- [ ] **Frontend typecheck + lint**

Run: `cd pr1as-client && npm run typecheck && npm run lint`
Expected: no type errors; no new lint errors.

- [ ] **Append a SESSIONS.md entry** summarizing the worker-service hashtags feature (what changed, why), per the repo convention.
