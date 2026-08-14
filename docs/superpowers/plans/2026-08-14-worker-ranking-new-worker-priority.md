# Worker Ranking: New-Worker Priority Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current `[tier, onlineRank, scatter]` worker discovery sort with an 8-key cascade (`boost tier → reputation gate → online → completed_bookings → average_rating → reputation_score → created_at → scatter`), applied identically to both `GET /api/workers/grouped-by-service` and `GET /api/workers/search-by-hashtag`, so newer profiles naturally surface first among peers tied on every other stat.

**Architecture:** One shared pure comparator (`compareWorkerRanking`) in `worker.service.ts` replaces the existing `getWorkerBoostSortKey`. Both aggregations gain `average_rating`/`completed_bookings`/`created_at` via `$lookup` into `Review`/`Booking` (same pattern as the existing `getWorkerSuggestions` candidate query). `search-by-hashtag` drops DB-level `$skip`/`$limit` in favor of an in-memory sort-then-slice, because boost/online can't be evaluated inside MongoDB and outrank everything else.

**Tech Stack:** Node.js + TypeScript, Express, Mongoose aggregation pipelines, Jest (ts-jest, mocked repositories — no DB in tests).

## Global Constraints

- Sort key order, exactly: `[tier, reputationGate, onlineRank, -completed_bookings, -average_rating, -reputation_score, -created_at.getTime(), scatter]` — see design spec `docs/superpowers/specs/2026-08-14-worker-ranking-new-worker-priority-design.md`.
- `reputationGate = 1` when `reputation_score < 30`, else `0` — independent override, placed right after boost tier.
- No `is_new` flag or badge is added to any API response — this is a ranking-only change.
- `average_rating`, `completed_bookings`, `created_at` are internal ranking inputs only — they must never appear in the JSON returned by either endpoint (strip before returning).
- Both endpoints must call the same `compareWorkerRanking` function — no duplicated sort logic.
- Fix the existing bug: `searchWorkersByHashtag` reads `$worker.reputation_score` but the real field is `$worker.meta_data.reputation_score` (`SERVER/src/repositories/worker/worker-service.repository.ts:799`).
- TypeScript strict mode + `noUnusedLocals`/`noUnusedParameters` must pass: run `cd SERVER && npx tsc --noEmit` after every task.
- No new tests requiring a real MongoDB — this repo has no `mongodb-memory-server`; all existing tests mock repositories/models. Aggregation pipeline changes are verified by type-check + manual query, matching how `findWorkersGroupedByService`/`searchWorkersByHashtag`/`findSuggestionCandidatesForWorker` are already (untested at the pipeline level) in this codebase.

---

### Task 1: Shared ranking comparator (pure function, TDD)

**Files:**
- Modify: `SERVER/src/services/worker/worker.service.ts:184-199` (replace `getWorkerBoostSortKey`)
- Modify: `SERVER/src/services/worker/worker-sort.test.ts` (replace entirely)

**Interfaces:**
- Produces: `export interface WorkerRankingInput { id: string; reputation_score: number; completed_bookings: number; average_rating: number; created_at: Date | null; }`
- Produces: `export const compareWorkerRanking = (a: WorkerRankingInput, b: WorkerRankingInput, boostByWorkerId: Map<string, { tier: number }>, onlineWorkerIds: Set<string>, slotId: number): number`
- Produces (used internally by the above, but exported for direct testing): `export const getWorkerRankingSortKey = (worker: WorkerRankingInput, boostByWorkerId: Map<string, { tier: number }>, onlineWorkerIds: Set<string>, slotId: number): [number, number, number, number, number, number, number, number]`
- Removes: `getWorkerBoostSortKey` (no other file imports it — verified via `grep -rn "getWorkerBoostSortKey"`).

- [ ] **Step 1: Write the failing test**

Replace the full contents of `SERVER/src/services/worker/worker-sort.test.ts`:

```ts
import { compareWorkerRanking, WorkerRankingInput } from "./worker.service";

const baseWorker = (
  overrides: Partial<WorkerRankingInput> & { id: string }
): WorkerRankingInput => ({
  reputation_score: 100,
  completed_bookings: 0,
  average_rating: 0,
  created_at: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

describe("compareWorkerRanking", () => {
  const slotId = 100;
  const noBoosts = new Map<string, { tier: number }>();
  const noneOnline = new Set<string>();

  it("ranks a featured-boosted worker ahead of a higher-merit unboosted worker", () => {
    const featured = baseWorker({ id: "worker-featured" });
    const unboosted = baseWorker({ id: "worker-unboosted", completed_bookings: 999 });
    const boostByWorkerId = new Map([["worker-featured", { tier: 1 }]]);

    const result = compareWorkerRanking(
      featured,
      unboosted,
      boostByWorkerId,
      noneOnline,
      slotId
    );

    expect(result).toBeLessThan(0);
  });

  it("pushes a reputation-flagged worker (<30) to the back even with more completed bookings", () => {
    const flagged = baseWorker({
      id: "worker-flagged",
      reputation_score: 10,
      completed_bookings: 999,
    });
    const clean = baseWorker({ id: "worker-clean", reputation_score: 100 });

    const result = compareWorkerRanking(flagged, clean, noBoosts, noneOnline, slotId);

    expect(result).toBeGreaterThan(0);
  });

  it("ranks an online worker ahead of an offline worker within the same tier and reputation gate", () => {
    const online = baseWorker({ id: "worker-aaaa1111" });
    const offline = baseWorker({ id: "worker-bbbb2222" });
    const onlineWorkerIds = new Set(["worker-aaaa1111"]);

    const result = compareWorkerRanking(online, offline, noBoosts, onlineWorkerIds, slotId);

    expect(result).toBeLessThan(0);
  });

  it("ranks higher completed_bookings ahead when tier/gate/online are tied", () => {
    const busy = baseWorker({ id: "worker-busy", completed_bookings: 10 });
    const idle = baseWorker({ id: "worker-idle", completed_bookings: 1 });

    const result = compareWorkerRanking(busy, idle, noBoosts, noneOnline, slotId);

    expect(result).toBeLessThan(0);
  });

  it("falls back to average_rating when completed_bookings are tied", () => {
    const highRated = baseWorker({
      id: "worker-high",
      completed_bookings: 5,
      average_rating: 4.8,
    });
    const lowRated = baseWorker({
      id: "worker-low",
      completed_bookings: 5,
      average_rating: 3.0,
    });

    const result = compareWorkerRanking(highRated, lowRated, noBoosts, noneOnline, slotId);

    expect(result).toBeLessThan(0);
  });

  it("falls back to reputation_score when bookings and rating are tied", () => {
    const higherRep = baseWorker({
      id: "worker-rep-high",
      completed_bookings: 5,
      average_rating: 4,
      reputation_score: 95,
    });
    const lowerRep = baseWorker({
      id: "worker-rep-low",
      completed_bookings: 5,
      average_rating: 4,
      reputation_score: 60,
    });

    const result = compareWorkerRanking(higherRep, lowerRep, noBoosts, noneOnline, slotId);

    expect(result).toBeLessThan(0);
  });

  it("ranks a newly created worker ahead of an older one when every merit stat is tied", () => {
    const newer = baseWorker({
      id: "worker-new",
      created_at: new Date("2026-08-10T00:00:00Z"),
    });
    const older = baseWorker({
      id: "worker-old",
      created_at: new Date("2025-01-01T00:00:00Z"),
    });

    const result = compareWorkerRanking(newer, older, noBoosts, noneOnline, slotId);

    expect(result).toBeLessThan(0);
  });

  it("is deterministic for the same inputs (stable scatter tiebreak)", () => {
    const a = baseWorker({ id: "worker-aaaa0001" });
    const b = baseWorker({ id: "worker-bbbb0002" });

    const first = compareWorkerRanking(a, b, noBoosts, noneOnline, slotId);
    const second = compareWorkerRanking(a, b, noBoosts, noneOnline, slotId);

    expect(first).toBe(second);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd SERVER && npx jest src/services/worker/worker-sort.test.ts`
Expected: FAIL — `compareWorkerRanking` is not exported from `./worker.service` (module has no such export yet).

- [ ] **Step 3: Implement the comparator**

In `SERVER/src/services/worker/worker.service.ts`, replace lines 184-199 (the current `getWorkerBoostSortKey` block, from the `// Sort key for worker discovery` comment through the closing `};`) with:

```ts
export interface WorkerRankingInput {
  id: string;
  reputation_score: number;
  completed_bookings: number;
  average_rating: number;
  created_at: Date | null;
}

// Sort key for worker discovery ranking, evaluated left-to-right:
//   1. boost tier      — paid ranking always wins (featured < basic < none)
//   2. reputation gate — score < 30 (e.g. moderation-flagged) pushed to the
//                        back regardless of the merit stats below
//   3. online-now       — tie-break within the same tier/gate
//   4-6. merit cascade  — completed bookings, then rating, then raw
//                        reputation score, all descending
//   7. created_at        — newer profiles surface first among peers tied on
//                        every stat above; this IS the new-worker priority,
//                        expressed with no separate flag or time window
//   8. scatter            — deterministic rotation so ties still split
//                        exposure fairly over time
export const getWorkerRankingSortKey = (
  worker: WorkerRankingInput,
  boostByWorkerId: Map<string, { tier: number }>,
  onlineWorkerIds: Set<string>,
  slotId: number
): [number, number, number, number, number, number, number, number] => {
  const boost = boostByWorkerId.get(worker.id);
  const tier = boost ? boost.tier : 999;
  const reputationGate = worker.reputation_score < 30 ? 1 : 0;
  const onlineRank = onlineWorkerIds.has(worker.id) ? 0 : 1;
  // Cheap deterministic scatter within same tier using last 4 hex chars of id
  const scatter = (parseInt(worker.id.slice(-4), 16) + slotId) % 1000;
  return [
    tier,
    reputationGate,
    onlineRank,
    -worker.completed_bookings,
    -worker.average_rating,
    -worker.reputation_score,
    worker.created_at ? -worker.created_at.getTime() : 0,
    scatter,
  ];
};

export const compareWorkerRanking = (
  a: WorkerRankingInput,
  b: WorkerRankingInput,
  boostByWorkerId: Map<string, { tier: number }>,
  onlineWorkerIds: Set<string>,
  slotId: number
): number => {
  const keyA = getWorkerRankingSortKey(a, boostByWorkerId, onlineWorkerIds, slotId);
  const keyB = getWorkerRankingSortKey(b, boostByWorkerId, onlineWorkerIds, slotId);
  for (let i = 0; i < keyA.length; i += 1) {
    if (keyA[i] !== keyB[i]) return keyA[i] - keyB[i];
  }
  return 0;
};
```

Note: this leaves the two call sites in `getWorkersGroupedByService` (around lines 568-584) referencing the now-deleted `getWorkerBoostSortKey` — that's expected; Task 4 fixes them. This task only needs to typecheck in isolation for the new exports, so a full `tsc --noEmit` will show pre-existing-in-progress errors at those call sites until Task 4 lands. Confirm via step 4 that the errors are *only* at those two known call sites, not elsewhere.

- [ ] **Step 4: Run the test to verify it passes, and scope-check the expected type error**

Run: `cd SERVER && npx jest src/services/worker/worker-sort.test.ts`
Expected: PASS (8 tests).

Run: `cd SERVER && npx tsc --noEmit`
Expected: errors only on the two `getWorkerBoostSortKey(...)` call sites inside `getWorkersGroupedByService` (`worker.service.ts:569` and `:575`, "Cannot find name 'getWorkerBoostSortKey'"). No other errors. These are resolved by Task 4.

- [ ] **Step 5: Commit**

```bash
cd SERVER && git add src/services/worker/worker.service.ts src/services/worker/worker-sort.test.ts
git commit -m "feat(worker): add full ranking comparator with new-worker tiebreak"
```

---

### Task 2: Add merit fields to `findWorkersGroupedByService` + fix reputation field-path pattern reuse

**Files:**
- Modify: `SERVER/src/repositories/worker/worker-service.repository.ts:455-748`

**Interfaces:**
- Produces: the resolved-promise item type of `findWorkersGroupedByService` gains three fields on each worker: `average_rating: number`, `completed_bookings: number`, `created_at: Date | null`.
- Consumes: `modelsName.REVIEW`, `modelsName.BOOKING`, `ReviewType`, `BookingStatus` — all already imported at the top of this file (used by `findSuggestionCandidatesForWorker`, lines 1-14).

- [ ] **Step 1: Extend the return type signature**

In `findWorkersGroupedByService`'s return type (function signature, currently lines 455-494), inside the `workers: Array<{ ... }>` object literal, add three fields after `last_active_at: Date | null;`:

```ts
        reputation_score: number;
        last_active_at: Date | null;
        average_rating: number;
        completed_bookings: number;
        created_at: Date | null;
        pricing: WorkerServicePricing[];
```

(Only the three new lines are additions; `reputation_score`/`last_active_at`/`pricing` already exist — keep their order, insert the new fields between `last_active_at` and `pricing`.)

- [ ] **Step 2: Insert `$lookup`/`$addFields` stages for review + booking summaries**

In the same file, find the `stages.push(` call that currently starts with the `$addFields` for `_reputation_priority` (currently around line 637):

```ts
    stages.push(
      {
        $addFields: {
          // Workers with reputation_score < 30 get sort priority 1 (pushed to back), others get 0
          _reputation_priority: {
```

Replace that `stages.push(` call's opening so it adds two `$lookup` stages and merges the new fields into the same `$addFields`, right before `_reputation_priority`:

```ts
    stages.push(
      {
        $lookup: {
          from: modelsName.REVIEW,
          let: { workerId: "$worker._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$worker_id", "$$workerId"] },
                    { $eq: ["$is_visible", true] },
                    { $eq: ["$review_type", ReviewType.CLIENT_TO_WORKER] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                average_rating: { $avg: "$rating" },
              },
            },
          ],
          as: "review_summary",
        },
      },
      {
        $lookup: {
          from: modelsName.BOOKING,
          let: { workerId: "$worker._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$worker_id", "$$workerId"] },
                    { $eq: ["$status", BookingStatus.COMPLETED] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                completed_bookings: { $sum: 1 },
              },
            },
          ],
          as: "booking_summary",
        },
      },
      {
        $addFields: {
          _average_rating: {
            $round: [
              {
                $ifNull: [
                  { $arrayElemAt: ["$review_summary.average_rating", 0] },
                  0,
                ],
              },
              1,
            ],
          },
          _completed_bookings: {
            $ifNull: [
              { $arrayElemAt: ["$booking_summary.completed_bookings", 0] },
              0,
            ],
          },
          // Workers with reputation_score < 30 get sort priority 1 (pushed to back), others get 0
          _reputation_priority: {
```

Leave the rest of that `$addFields` block (the `_reputation_priority` cond) and the following `$sort`/`$group`/`$sort` stages untouched for now — Step 3 handles the `$group`/`$push` additions.

- [ ] **Step 3: Push the new fields into the grouped worker array**

In the same `stages.push(...)` call, inside the `$group` → `workers: { $push: { ... } }` object (currently lines 673-693), add three lines after `last_active_at`:

```ts
              reputation_score: {
                $ifNull: ["$worker.meta_data.reputation_score", 0],
              },
              last_active_at: { $ifNull: ["$worker.last_active_at", null] },
              average_rating: "$_average_rating",
              completed_bookings: "$_completed_bookings",
              created_at: { $ifNull: ["$worker.created_at", null] },
              pricing: "$pricing",
```

- [ ] **Step 4: Extend the `.map()` return type to match**

In the same file, in the `.map((item: {...}) => ({...}))` block at the end of `findWorkersGroupedByService` (currently lines 705-747), the inline `workers: Array<{...}>` type also needs the three new fields, in the same place as Step 1:

```ts
          reputation_score: number;
          last_active_at: Date | null;
          average_rating: number;
          completed_bookings: number;
          created_at: Date | null;
          pricing: WorkerServicePricing[];
```

The `.map()` body itself (`(item) => ({ service: item.service, workers: item.workers })`) needs no change — it already passes `workers` through untouched, so the new fields flow through automatically once the type includes them.

- [ ] **Step 5: Type-check**

Run: `cd SERVER && npx tsc --noEmit`
Expected: no errors referencing `worker-service.repository.ts`.

- [ ] **Step 6: Manual sanity check against a running DB**

Run: `cd SERVER && npm run dev`, then hit `GET /api/workers/grouped-by-service` (with a valid category/hashtag filter for your seed data) via curl or the browser. Confirm the request succeeds (no aggregation errors) — the new `average_rating`/`completed_bookings`/`created_at` fields are internal and won't appear in the controller's response yet (Task 4 strips them before that point too, so this is just confirming the aggregation itself doesn't throw).

- [ ] **Step 7: Commit**

```bash
cd SERVER && git add src/repositories/worker/worker-service.repository.ts
git commit -m "feat(worker): add rating/bookings/created_at to grouped-by-service aggregation"
```

---

### Task 3: Replace `searchWorkersByHashtag` DB pagination with `findHashtagCandidates`

**Files:**
- Modify: `SERVER/src/repositories/worker/worker-service.repository.ts` (top-of-file interfaces + the `searchWorkersByHashtag` method, currently lines 761-854)

**Interfaces:**
- Removes: `searchWorkersByHashtag(normalizedQuery: string, skip: number, limit: number): Promise<{ data: WorkerHashtagCard[]; total: number }>`
- Produces: `export interface WorkerHashtagCandidate { id: string; full_name: string | null; avatar: string | null; worker_profile: {...} | null; reputation_score: number; average_rating: number; completed_bookings: number; created_at: Date | null; matched_hashtags: string[]; }`
- Produces: `async findHashtagCandidates(normalizedQuery: string): Promise<WorkerHashtagCandidate[]>` — returns ALL matches, no pagination; caller sorts and slices.

- [ ] **Step 1: Add the `WorkerHashtagCandidate` interface**

In `SERVER/src/repositories/worker/worker-service.repository.ts`, add this new interface right after the existing `WorkerSuggestionCandidate` interface (currently ends at line 77, before `const LOCATION_RADIUS_KM = 30;`):

```ts
export interface WorkerHashtagCandidate {
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
  average_rating: number;
  completed_bookings: number;
  created_at: Date | null;
  matched_hashtags: string[];
}
```

- [ ] **Step 2: Replace `searchWorkersByHashtag` with `findHashtagCandidates`**

Replace the entire method (currently lines 761-854, from `async searchWorkersByHashtag(` through its closing `}` before the class's final `}`):

```ts
  async findHashtagCandidates(
    normalizedQuery: string
  ): Promise<WorkerHashtagCandidate[]> {
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
          reputation_score: { $first: "$worker.meta_data.reputation_score" },
          all_hashtags: { $push: "$hashtags" },
        },
      },
      {
        $lookup: {
          from: modelsName.REVIEW,
          let: { workerId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$worker_id", "$$workerId"] },
                    { $eq: ["$is_visible", true] },
                    { $eq: ["$review_type", ReviewType.CLIENT_TO_WORKER] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                average_rating: { $avg: "$rating" },
              },
            },
          ],
          as: "review_summary",
        },
      },
      {
        $lookup: {
          from: modelsName.BOOKING,
          let: { workerId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$worker_id", "$$workerId"] },
                    { $eq: ["$status", BookingStatus.COMPLETED] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                completed_bookings: { $sum: 1 },
              },
            },
          ],
          as: "booking_summary",
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
          reputation_score: { $ifNull: ["$reputation_score", 0] },
          average_rating: {
            $round: [
              {
                $ifNull: [
                  { $arrayElemAt: ["$review_summary.average_rating", 0] },
                  0,
                ],
              },
              1,
            ],
          },
          completed_bookings: {
            $ifNull: [
              { $arrayElemAt: ["$booking_summary.completed_bookings", 0] },
              0,
            ],
          },
          created_at: { $ifNull: ["$worker.created_at", null] },
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
    ];

    return WorkerService.aggregate<WorkerHashtagCandidate>(pipeline);
  }
```

Note the bug fix embedded here: `reputation_score: { $first: "$worker.meta_data.reputation_score" }` (was `"$worker.reputation_score"`, which always resolved to `undefined`).

- [ ] **Step 3: Type-check**

Run: `cd SERVER && npx tsc --noEmit`
Expected: new errors only in `worker.service.ts` where `searchByHashtag` still calls the now-removed `workerServiceRepository.searchWorkersByHashtag` — expected, fixed in Task 5.

- [ ] **Step 4: Commit**

```bash
cd SERVER && git add src/repositories/worker/worker-service.repository.ts
git commit -m "fix(worker): correct hashtag search reputation field path, drop DB pagination for ranked sort"
```

---

### Task 4: Wire the comparator into `getWorkersGroupedByService` + extract shared boost/presence context

**Files:**
- Modify: `SERVER/src/services/worker/worker.service.ts:531-585`

**Interfaces:**
- Consumes: `compareWorkerRanking`, `WorkerRankingInput` (Task 1); `workerBoostRepository.findActiveBoostsForWorkers`, `boostConfigRepository.get`, `isUserOnlineBulk` (already imported at top of file).
- Produces: `getBoostPresenceContext(workerIds: string[]): Promise<{ boostByWorkerId: Map<string, { tier: number }>; onlineWorkerIds: Set<string>; slotId: number }>` — a module-level helper, reused by Task 5.

- [ ] **Step 1: Add the shared `getBoostPresenceContext` helper**

In `SERVER/src/services/worker/worker.service.ts`, add this right after the `compareWorkerRanking` function from Task 1 (i.e. right before `export class WorkerService {`):

```ts
interface BoostPresenceContext {
  boostByWorkerId: Map<string, { tier: number }>;
  onlineWorkerIds: Set<string>;
  slotId: number;
}

const getBoostPresenceContext = async (
  workerIds: string[]
): Promise<BoostPresenceContext> => {
  const [activeBoosts, boostConfig] = await Promise.all([
    workerBoostRepository.findActiveBoostsForWorkers(workerIds),
    boostConfigRepository.get(),
  ]);

  const boostByWorkerId = new Map(activeBoosts.map((b) => [b.user_id, b]));
  const onlineWorkerIds = isUserOnlineBulk(workerIds);
  // Deterministic rotation: slot changes every rotation_interval_minutes so
  // all boosted workers at the same tier get equal exposure over time.
  const slotId = Math.floor(
    Date.now() / (boostConfig.rotation_interval_minutes * 60 * 1000)
  );

  return { boostByWorkerId, onlineWorkerIds, slotId };
};
```

- [ ] **Step 2: Replace the boost-fetch + sort block in `getWorkersGroupedByService`**

Replace this block (currently lines 531-585, from the `// Collect all worker ids...` comment through the closing `}));` of `groupedWithBoost`):

```ts
    // Collect all worker ids, fetch active boosts, then apply boost-tier sort
    const allWorkerIds = [
      ...new Set(groupedWorkers.flatMap((g) => g.workers.map((w) => w.id))),
    ];

    const [activeBoosts, boostConfig] = await Promise.all([
      workerBoostRepository.findActiveBoostsForWorkers(allWorkerIds),
      boostConfigRepository.get(),
    ]);

    const boostByWorkerId = new Map(activeBoosts.map((b) => [b.user_id, b]));
    const onlineWorkerIds = isUserOnlineBulk(allWorkerIds);

    // Deterministic rotation: slot changes every rotation_interval_minutes so
    // all boosted workers at the same tier get equal exposure over time.
    const slotId = Math.floor(
      Date.now() / (boostConfig.rotation_interval_minutes * 60 * 1000)
    );

    const groupedWithBoost = groupedWorkers.map((group) => ({
      ...group,
      workers: group.workers
        .map((w) => {
          const boost = boostByWorkerId.get(w.id);
          return {
            ...w,
            boost: {
              is_boosted: Boolean(boost),
              boost_type: boost ? (boost.tier === 1 ? "featured" : "basic") : null,
              boost_tier: boost ? boost.tier : null,
            },
            presence: {
              is_online: onlineWorkerIds.has(w.id),
              last_active_at: w.last_active_at ?? null,
            },
          };
        })
        .sort((a, b) => {
          const [tierA, onlineA, scatterA] = getWorkerBoostSortKey(
            a.id,
            boostByWorkerId,
            onlineWorkerIds,
            slotId
          );
          const [tierB, onlineB, scatterB] = getWorkerBoostSortKey(
            b.id,
            boostByWorkerId,
            onlineWorkerIds,
            slotId
          );
          if (tierA !== tierB) return tierA - tierB;
          if (onlineA !== onlineB) return onlineA - onlineB;
          return scatterA - scatterB;
        }),
    }));
```

With:

```ts
    // Collect all worker ids, fetch boost/presence context, then apply the
    // full ranking sort (see compareWorkerRanking for the exact key order)
    const allWorkerIds = [
      ...new Set(groupedWorkers.flatMap((g) => g.workers.map((w) => w.id))),
    ];

    const { boostByWorkerId, onlineWorkerIds, slotId } =
      await getBoostPresenceContext(allWorkerIds);

    const groupedWithBoost = groupedWorkers.map((group) => {
      const annotated = group.workers.map((w) => {
        const boost = boostByWorkerId.get(w.id);
        return {
          ...w,
          boost: {
            is_boosted: Boolean(boost),
            boost_type: boost ? (boost.tier === 1 ? "featured" : "basic") : null,
            boost_tier: boost ? boost.tier : null,
          },
          presence: {
            is_online: onlineWorkerIds.has(w.id),
            last_active_at: w.last_active_at ?? null,
          },
        };
      });

      annotated.sort((a, b) =>
        compareWorkerRanking(a, b, boostByWorkerId, onlineWorkerIds, slotId)
      );

      return {
        service: group.service,
        // average_rating/completed_bookings/created_at are ranking-only
        // inputs (Task 2) — never returned to the client
        workers: annotated.map(
          ({ average_rating, completed_bookings, created_at, ...rest }) =>
            rest
        ),
      };
    });
```

- [ ] **Step 3: Type-check**

Run: `cd SERVER && npx tsc --noEmit`
Expected: no errors in `worker.service.ts` referencing `getWorkerBoostSortKey` anymore. (`searchByHashtag` errors from Task 3 remain — fixed next in Task 5.)

- [ ] **Step 4: Manual sanity check**

Run: `cd SERVER && npm run dev`, then `curl http://localhost:3000/api/workers/grouped-by-service` (add auth/query params your local seed data needs). Confirm:
- Response succeeds and each worker object still has `boost`/`presence` fields.
- No worker object in the response has `average_rating`, `completed_bookings`, or `created_at` keys.

- [ ] **Step 5: Commit**

```bash
cd SERVER && git add src/services/worker/worker.service.ts
git commit -m "feat(worker): apply full ranking cascade to grouped-by-service discovery"
```

---

### Task 5: Rewrite `searchByHashtag` for in-memory ranked pagination

**Files:**
- Modify: `SERVER/src/services/worker/worker.service.ts:765-795` (the `searchByHashtag` method)
- Modify: `SERVER/src/services/worker/worker.service.test.ts`

**Interfaces:**
- Consumes: `workerServiceRepository.findHashtagCandidates` (Task 3), `getBoostPresenceContext`, `compareWorkerRanking` (Task 4/1).
- Produces: `searchByHashtag(rawQuery: string, page?: number, limit?: number): Promise<PaginatedResponse<WorkerHashtagCard>>` — same public signature as before; internal implementation changes.

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `SERVER/src/services/worker/worker.service.test.ts`:

```ts
jest.mock("../../repositories/worker/worker-service.repository", () => ({
  workerServiceRepository: {
    findHashtagCandidates: jest.fn(),
    findAllForWorker: jest.fn(),
  },
}));

jest.mock("../../repositories/auth/user.repository", () => ({
  userRepository: {
    findById: jest.fn(),
  },
}));

jest.mock("../../repositories/review/review.repository", () => ({
  reviewRepository: {
    getStatsByWorkerId: jest.fn(),
    findByWorkerId: jest.fn(),
  },
}));

jest.mock("../../services/moderation", () => ({
  moderationService: {
    isProfileBlocked: jest.fn(),
    assertNoActiveRestriction: jest.fn(),
  },
}));

jest.mock("../../repositories/boost/worker-boost.repository", () => ({
  workerBoostRepository: {
    findActiveBoostsForWorkers: jest.fn(),
  },
}));

jest.mock("../../repositories/boost/boost-config.repository", () => ({
  boostConfigRepository: {
    get: jest.fn(),
  },
}));

jest.mock("../../config/socket.handlers", () => ({
  isUserOnlineBulk: jest.fn(),
}));

import { workerService } from "./worker.service";
import { workerServiceRepository } from "../../repositories/worker/worker-service.repository";
import { userRepository } from "../../repositories/auth/user.repository";
import { reviewRepository } from "../../repositories/review/review.repository";
import { moderationService } from "../../services/moderation";
import { workerBoostRepository } from "../../repositories/boost/worker-boost.repository";
import { boostConfigRepository } from "../../repositories/boost/boost-config.repository";
import { isUserOnlineBulk } from "../../config/socket.handlers";

const stubNoBoostNoOnline = () => {
  (workerBoostRepository.findActiveBoostsForWorkers as jest.Mock).mockResolvedValue(
    []
  );
  (boostConfigRepository.get as jest.Mock).mockResolvedValue({
    rotation_interval_minutes: 30,
  });
  (isUserOnlineBulk as jest.Mock).mockReturnValue(new Set());
};

const candidate = (overrides: Record<string, unknown> & { id: string }) => ({
  full_name: null,
  avatar: null,
  worker_profile: null,
  reputation_score: 100,
  average_rating: 0,
  completed_bookings: 0,
  created_at: new Date("2026-01-01T00:00:00Z"),
  matched_hashtags: ["it"],
  ...overrides,
});

describe("workerService.searchByHashtag", () => {
  beforeEach(() => jest.clearAllMocks());

  it("normalizes the query, ranks candidates newest-first when tied, and strips ranking fields", async () => {
    (workerServiceRepository.findHashtagCandidates as jest.Mock).mockResolvedValue([
      candidate({ id: "w-old", created_at: new Date("2025-01-01T00:00:00Z") }),
      candidate({ id: "w-new", created_at: new Date("2026-08-01T00:00:00Z") }),
    ]);
    stubNoBoostNoOnline();

    const result = await workerService.searchByHashtag("#IT", 1, 20);

    expect(workerServiceRepository.findHashtagCandidates).toHaveBeenCalledWith("it");
    expect(result.data.map((w) => w.id)).toEqual(["w-new", "w-old"]);
    expect(result.data[0]).not.toHaveProperty("average_rating");
    expect(result.data[0]).not.toHaveProperty("completed_bookings");
    expect(result.data[0]).not.toHaveProperty("created_at");
    expect(result.pagination).toMatchObject({ page: 1, limit: 20, total: 2 });
  });

  it("returns an empty page without hitting the repo when the query normalizes to empty", async () => {
    const result = await workerService.searchByHashtag("###", 1, 20);

    expect(workerServiceRepository.findHashtagCandidates).not.toHaveBeenCalled();
    expect(result.data).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });

  it("slices the ranked candidates for the requested page", async () => {
    const candidates = Array.from({ length: 5 }, (_, i) =>
      candidate({ id: `w-${i}`, created_at: new Date(2026, 0, i + 1) })
    );
    (workerServiceRepository.findHashtagCandidates as jest.Mock).mockResolvedValue(
      candidates
    );
    stubNoBoostNoOnline();

    const result = await workerService.searchByHashtag("#it", 2, 2);

    expect(result.data).toHaveLength(2);
    expect(result.pagination).toMatchObject({ page: 2, limit: 2, total: 5 });
  });
});

describe("workerService.getWorkerById", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the worker's real reputation_score in the detail response", async () => {
    const workerId = "worker-123";
    const userId = { toString: () => workerId };

    (moderationService.isProfileBlocked as jest.Mock).mockResolvedValue(false);
    (moderationService.assertNoActiveRestriction as jest.Mock).mockResolvedValue(
      undefined
    );
    (userRepository.findById as jest.Mock).mockResolvedValue({
      _id: userId,
      full_name: "John Worker",
      avatar: "https://example.com/avatar.jpg",
      email: "john@example.com",
      meta_data: {
        reputation_score: 42,
      },
      worker_profile: {
        introduction: "I am a great worker",
        gallery_urls: [],
        work_locations: [],
      },
      coords: undefined,
    });
    (workerServiceRepository.findAllForWorker as jest.Mock).mockResolvedValue([]);
    (reviewRepository.getStatsByWorkerId as jest.Mock).mockResolvedValue({
      total: 0,
      average: 0,
    });
    (reviewRepository.findByWorkerId as jest.Mock).mockResolvedValue({
      reviews: [],
    });

    const result = await workerService.getWorkerById(workerId);

    expect(result.user.meta_data.reputation_score).toBe(42);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd SERVER && npx jest src/services/worker/worker.service.test.ts`
Expected: FAIL — `searchByHashtag` still calls the removed `workerServiceRepository.searchWorkersByHashtag`, so the mocked `findHashtagCandidates` is never called and assertions fail.

- [ ] **Step 3: Rewrite `searchByHashtag`**

In `SERVER/src/services/worker/worker.service.ts`, replace the `searchByHashtag` method (currently lines 765-795):

```ts
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

    const candidates =
      await workerServiceRepository.findHashtagCandidates(normalized);

    if (!candidates.length) {
      return PaginationHelper.formatResponse(
        [],
        pagination.page,
        pagination.limit,
        0
      );
    }

    const candidateIds = candidates.map((c) => c.id);
    const { boostByWorkerId, onlineWorkerIds, slotId } =
      await getBoostPresenceContext(candidateIds);

    const sorted = [...candidates].sort((a, b) =>
      compareWorkerRanking(a, b, boostByWorkerId, onlineWorkerIds, slotId)
    );

    // average_rating/completed_bookings/created_at are ranking-only inputs —
    // never returned to the client
    const pageItems: WorkerHashtagCard[] = sorted
      .slice(pagination.skip, pagination.skip + pagination.limit)
      .map(({ average_rating, completed_bookings, created_at, ...card }) => card);

    return PaginationHelper.formatResponse(
      pageItems,
      pagination.page,
      pagination.limit,
      candidates.length
    );
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd SERVER && npx jest src/services/worker/worker.service.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Full type-check and full backend test suite**

Run: `cd SERVER && npx tsc --noEmit`
Expected: no errors.

Run: `cd SERVER && npm test`
Expected: all suites pass.

- [ ] **Step 6: Manual sanity check**

Run: `cd SERVER && npm run dev`, then `curl "http://localhost:3000/api/workers/search-by-hashtag?q=<a real hashtag from seed data>&page=1&limit=10"`. Confirm the response succeeds, results are paginated correctly, and no worker object has `average_rating`/`completed_bookings`/`created_at` keys.

- [ ] **Step 7: Commit**

```bash
cd SERVER && git add src/services/worker/worker.service.ts src/services/worker/worker.service.test.ts
git commit -m "feat(worker): rank hashtag search results with the shared comparator and paginate in-memory"
```

---

### Task 6: Update memorybank docs to match the shipped design

**Files:**
- Modify: `memorybank/worker.md` (the "Sort and grouping" / "Boost integration" section, currently around lines 249-266)
- Modify: `memorybank/boost.md` (the "Discovery Integration" section, currently around lines 308-349)

**Interfaces:** None — documentation only.

- [ ] **Step 1: Update `memorybank/worker.md`**

Replace the "Sort and grouping" and "Boost integration" blocks (currently lines 249-266):

```markdown
Sort and grouping:

- Results are grouped by `service_id`.
- Groups sort by service code.
- Within each group, workers are ranked by `compareWorkerRanking`
  (`WorkerService`), an 8-key cascade evaluated left to right: boost tier,
  reputation gate (`reputation_score < 30` pushed to the back regardless of
  other stats), online status, `completed_bookings` desc, `average_rating`
  desc, `reputation_score` desc, `created_at` desc, deterministic scatter.
  See `boost.md` "Discovery Integration" for the full key list.
- `created_at` ranking last, before scatter, is how newly-created profiles
  surface first: a brand-new worker (0 bookings, 0 rating, default
  `reputation_score` 100) naturally sorts ahead of older workers with
  identical stats, with no separate "new" flag or time window.

Boost integration:

1. Fetch active boosts for all discovered worker ids.
2. Fetch boost config.
3. Compute online status for all discovered worker ids (live socket registry).
4. Fetch `average_rating`/`completed_bookings` per worker via `$lookup` into
   `Review`/`Booking` (same pattern as `getWorkerSuggestions`), and
   `created_at` from the worker's user document.
5. Attach `boost.is_boosted`, `boost_type`, `boost_tier`, and
   `presence.is_online`, `presence.last_active_at` to each worker in the
   response — `average_rating`/`completed_bookings`/`created_at` are used
   only for ranking and are stripped before the response is returned.
6. Sort workers using `compareWorkerRanking` (see above).
```

Also apply the identical ranking logic note to the "search by hashtag" section of this file if one exists — search for a heading covering `GET /api/workers/search-by-hashtag` and add a line: "As of 2026-08-14, hashtag search uses the same `compareWorkerRanking` cascade as grouped-by-service discovery (boost/online computed the same way), but pagination happens in-memory after the full sort rather than at the DB level, since boost/online can't be evaluated inside the aggregation." If no such section exists yet, skip this — don't invent a new heading structure.

- [ ] **Step 2: Update `memorybank/boost.md`**

Replace the "Discovery Integration" section (currently lines 308-349):

```markdown
## Discovery Integration

Worker discovery integration lives in `WorkerService.getWorkersGroupedByService`
and `WorkerService.searchByHashtag`, sharing the same ranking logic via
`compareWorkerRanking` (`worker.service.ts`).

Flow (both endpoints):

1. Worker search builds the candidate list (grouped by service, or hashtag
   matches).
2. It collects all worker ids in the result set.
3. `getBoostPresenceContext(workerIds)` fetches active boosts, boost config,
   and live online status for those ids in one shot.
4. `average_rating`/`completed_bookings` are computed via `$lookup` into
   `Review`/`Booking` in the aggregation; `created_at` comes from the
   worker's user document.
5. Grouped-by-service annotates each worker in the response with:

```ts
boost: {
  is_boosted: boolean,
  boost_type: "featured" | "basic" | null,
  boost_tier: 1 | 2 | null,
}
presence: {
  is_online: boolean,
  last_active_at: Date,
}
```

   (Hashtag search computes boost/online for ranking only — it does not add
   these fields to its response type.)

6. Both sort using `compareWorkerRanking`, an 8-key cascade:

```text
sort key = [
  tier,                          // featured=1, basic=2, unboosted=999
  reputationGate,                // reputation_score < 30 ? 1 : 0
  onlineRank,                    // online=0, offline=1
  -completed_bookings,
  -average_rating,
  -reputation_score,
  created_at ? -created_at.getTime() : 0,
  scatter,
]
```

Rotation (unchanged):

```text
slotId = floor(Date.now() / (rotation_interval_minutes * 60 * 1000))
scatter = (parseInt(workerId.last4Hex, 16) + slotId) % 1000
```

New-worker priority is expressed purely through `created_at` ranking above
scatter — there is no separate "new" flag, badge, or time window. It only
becomes the deciding factor once boost tier, the reputation gate, online
status, completed bookings, rating, and reputation score are all tied,
which in practice means newly-created workers rotate ahead of other
newly-created workers with the same (usually zero) stats.
```

- [ ] **Step 3: Commit**

```bash
git add memorybank/worker.md memorybank/boost.md
git commit -m "docs: document the full worker ranking cascade and new-worker priority"
```
