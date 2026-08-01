# Worker Reputation Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the worker's reputation score with a "build up from 0" model driven by profile completeness, reviews, job completion, valid reports, and tiered cancellation/no-show penalties, while leaving the client's reputation system completely untouched.

**Architecture:** All new scoring rules are admin-tunable `reputation_config` keys (existing pattern), applied through the existing `ReputationService`/`ReputationHistory` primitives extended with a `defaultScore` parameter so worker adjustments default missing scores to 0 instead of 100. Hooks are added at existing trigger points (profile update, review create, booking status transitions, dispute resolution, report resolution) rather than new cron jobs — investigation found the two hardest cases (late completion, no-show) already have matching mechanisms (`booking-auto-complete.job.ts`, `DisputeReason.WORKER_NO_SHOW`).

**Tech Stack:** Node.js/Express/TypeScript/Mongoose (`SERVER/`), Next.js/React/TypeScript (`pr1as-client/`), Jest (`ts-jest`).

## Global Constraints

- Client reputation stays byte-for-byte unchanged: `client_late_cancel_deduction`, the `<30` gates for client actions, and daily recovery for clients must keep working exactly as before.
- `booking_expiry_deduction` and `warning_threshold` are unchanged in value; only their `defaultScore` fallback (0 vs 100) changes for worker-side calls.
- Every new reputation config key must be added to `REPUTATION_CONFIG_DEFAULTS` (auto-seeded by existing `seedDefaults()`), and toggleable keys must be added to `TOGGLEABLE_REPUTATION_KEYS`.
- No semicolons in frontend TypeScript; Tailwind-only styling; `const` arrow handlers prefixed `handle*`; i18n keys must be added to all 4 locale files (`vi`, `en`, `zh`, `ko`) together.
- Backend `tsconfig` is strict with `noUnusedLocals`/`noUnusedParameters` — keep imports/params clean.
- Full spec: [docs/superpowers/specs/2026-08-02-worker-reputation-rework-design.md](../specs/2026-08-02-worker-reputation-rework-design.md).

---

### Task 1: New reputation config keys

**Files:**
- Modify: `SERVER/src/types/reputation/reputation-config.types.ts`
- Test: `SERVER/src/types/reputation/reputation-config.types.test.ts`

**Interfaces:**
- Produces: `ReputationConfigKey.PROFILE_PHOTOS_BONUS`, `.MIN_PROFILE_PHOTOS_THRESHOLD`, `.PROFILE_INFO_FIELD_BONUS`, `.REVIEW_RECEIVED_BONUS`, `.FIVE_STAR_REVIEW_BONUS`, `.JOB_COMPLETION_BONUS`, `.REPORT_FILED_VALID_BONUS`, `.REPORTED_VALID_PENALTY`, `.LATE_COMPLETION_PENALTY`, `.CANCEL_MEDIUM_PENALTY`, `.CANCEL_SEVERE_PENALTY`, `.CANCEL_NOSHOW_PENALTY` — all consumed by later tasks' `reputationConfigService.getValue`/`getActiveValue` calls.

- [ ] **Step 1: Write the failing test**

```ts
// SERVER/src/types/reputation/reputation-config.types.test.ts
import {
  REPUTATION_CONFIG_DEFAULTS,
  ReputationConfigKey,
  TOGGLEABLE_REPUTATION_KEYS,
} from "./reputation-config.types";

describe("reputation config defaults", () => {
  it("has a default entry for every enum key", () => {
    for (const key of Object.values(ReputationConfigKey)) {
      expect(REPUTATION_CONFIG_DEFAULTS[key]).toBeDefined();
      expect(typeof REPUTATION_CONFIG_DEFAULTS[key].value).toBe("number");
    }
  });

  it("marks the new worker scoring keys as toggleable, thresholds as not", () => {
    expect(
      TOGGLEABLE_REPUTATION_KEYS.has(ReputationConfigKey.PROFILE_PHOTOS_BONUS)
    ).toBe(true);
    expect(
      TOGGLEABLE_REPUTATION_KEYS.has(
        ReputationConfigKey.PROFILE_INFO_FIELD_BONUS
      )
    ).toBe(true);
    expect(
      TOGGLEABLE_REPUTATION_KEYS.has(ReputationConfigKey.CANCEL_NOSHOW_PENALTY)
    ).toBe(true);
    expect(
      TOGGLEABLE_REPUTATION_KEYS.has(
        ReputationConfigKey.MIN_PROFILE_PHOTOS_THRESHOLD
      )
    ).toBe(false);
  });

  it("raises the low-review deduction default from 5 to 10", () => {
    expect(
      REPUTATION_CONFIG_DEFAULTS[ReputationConfigKey.LOW_REVIEW_DEDUCTION]
        .value
    ).toBe(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd SERVER && npx jest reputation-config.types.test.ts`
Expected: FAIL — `ReputationConfigKey.PROFILE_PHOTOS_BONUS` is `undefined`, and the low-review-deduction assertion fails (currently 5).

- [ ] **Step 3: Implement**

Edit `SERVER/src/types/reputation/reputation-config.types.ts`:

```ts
export enum ReputationConfigKey {
  BOOKING_EXPIRY_DEDUCTION = "booking_expiry_deduction",
  // Deprecated: replaced by CANCEL_MEDIUM_PENALTY / CANCEL_SEVERE_PENALTY.
  // Kept so existing reputation_config rows and reputation_history entries
  // referencing this key stay valid; no code path writes to it anymore.
  WORKER_CANCEL_DEDUCTION = "worker_cancel_deduction",
  CLIENT_LATE_CANCEL_DEDUCTION = "client_late_cancel_deduction",
  LOW_REVIEW_DEDUCTION = "low_review_deduction",
  LOW_REVIEW_THRESHOLD = "low_review_threshold",
  DAILY_RECOVERY_POINTS = "daily_recovery_points",
  WARNING_THRESHOLD = "warning_threshold",
  PROFILE_PHOTOS_BONUS = "profile_photos_bonus",
  MIN_PROFILE_PHOTOS_THRESHOLD = "min_profile_photos_threshold",
  PROFILE_INFO_FIELD_BONUS = "profile_info_field_bonus",
  REVIEW_RECEIVED_BONUS = "review_received_bonus",
  FIVE_STAR_REVIEW_BONUS = "five_star_review_bonus",
  JOB_COMPLETION_BONUS = "job_completion_bonus",
  REPORT_FILED_VALID_BONUS = "report_filed_valid_bonus",
  REPORTED_VALID_PENALTY = "reported_valid_penalty",
  LATE_COMPLETION_PENALTY = "late_completion_penalty",
  CANCEL_MEDIUM_PENALTY = "cancel_medium_penalty",
  CANCEL_SEVERE_PENALTY = "cancel_severe_penalty",
  CANCEL_NOSHOW_PENALTY = "cancel_noshow_penalty",
}

export interface IReputationConfigDocument {
  _id: Types.ObjectId;
  key: ReputationConfigKey;
  value: number;
  active: boolean;
  description: string;
  updated_by: Types.ObjectId | null;
  updated_at: Date;
}

export const TOGGLEABLE_REPUTATION_KEYS: ReadonlySet<ReputationConfigKey> =
  new Set([
    ReputationConfigKey.BOOKING_EXPIRY_DEDUCTION,
    ReputationConfigKey.WORKER_CANCEL_DEDUCTION,
    ReputationConfigKey.CLIENT_LATE_CANCEL_DEDUCTION,
    ReputationConfigKey.LOW_REVIEW_DEDUCTION,
    ReputationConfigKey.DAILY_RECOVERY_POINTS,
    ReputationConfigKey.PROFILE_PHOTOS_BONUS,
    ReputationConfigKey.PROFILE_INFO_FIELD_BONUS,
    ReputationConfigKey.REVIEW_RECEIVED_BONUS,
    ReputationConfigKey.FIVE_STAR_REVIEW_BONUS,
    ReputationConfigKey.JOB_COMPLETION_BONUS,
    ReputationConfigKey.REPORT_FILED_VALID_BONUS,
    ReputationConfigKey.REPORTED_VALID_PENALTY,
    ReputationConfigKey.LATE_COMPLETION_PENALTY,
    ReputationConfigKey.CANCEL_MEDIUM_PENALTY,
    ReputationConfigKey.CANCEL_SEVERE_PENALTY,
    ReputationConfigKey.CANCEL_NOSHOW_PENALTY,
  ]);

export const REPUTATION_CONFIG_DEFAULTS: Record<
  ReputationConfigKey,
  { value: number; active: boolean; description: string }
> = {
  [ReputationConfigKey.BOOKING_EXPIRY_DEDUCTION]: {
    value: 10,
    active: true,
    description: "Points deducted when a booking expires without worker confirmation",
  },
  [ReputationConfigKey.WORKER_CANCEL_DEDUCTION]: {
    value: 10,
    active: true,
    description: "Deprecated — replaced by cancel_medium_penalty/cancel_severe_penalty. No longer applied.",
  },
  [ReputationConfigKey.CLIENT_LATE_CANCEL_DEDUCTION]: {
    value: 5,
    active: true,
    description:
      "Points deducted when a client cancels within CANCELLATION_FREE_HOURS of the booking start time",
  },
  [ReputationConfigKey.LOW_REVIEW_DEDUCTION]: {
    value: 10,
    active: true,
    description: "Points deducted when a worker receives a review at or below the low-review threshold",
  },
  [ReputationConfigKey.LOW_REVIEW_THRESHOLD]: {
    value: 2,
    active: true,
    description: "Star rating at or below which a review triggers a deduction",
  },
  [ReputationConfigKey.DAILY_RECOVERY_POINTS]: {
    value: 5,
    active: true,
    description: "Points recovered daily for clients with reputation below max (100). Workers are excluded.",
  },
  [ReputationConfigKey.WARNING_THRESHOLD]: {
    value: 70,
    active: true,
    description: "Reputation score below which a warning notification is sent",
  },
  [ReputationConfigKey.PROFILE_PHOTOS_BONUS]: {
    value: 10,
    active: true,
    description: "Worker points awarded once gallery photo count reaches min_profile_photos_threshold",
  },
  [ReputationConfigKey.MIN_PROFILE_PHOTOS_THRESHOLD]: {
    value: 5,
    active: true,
    description: "Minimum gallery photo count required to earn profile_photos_bonus",
  },
  [ReputationConfigKey.PROFILE_INFO_FIELD_BONUS]: {
    value: 5,
    active: true,
    description: "Worker points awarded per filled profile info field (up to 10 fields)",
  },
  [ReputationConfigKey.REVIEW_RECEIVED_BONUS]: {
    value: 5,
    active: true,
    description: "Worker points awarded when a client review is received, any rating",
  },
  [ReputationConfigKey.FIVE_STAR_REVIEW_BONUS]: {
    value: 5,
    active: true,
    description: "Additional worker points when a received review's rating is 5",
  },
  [ReputationConfigKey.JOB_COMPLETION_BONUS]: {
    value: 5,
    active: true,
    description: "Worker points awarded when a booking they worked reaches completed",
  },
  [ReputationConfigKey.REPORT_FILED_VALID_BONUS]: {
    value: 10,
    active: true,
    description: "Worker points awarded when a report they filed is resolved as valid",
  },
  [ReputationConfigKey.REPORTED_VALID_PENALTY]: {
    value: 10,
    active: true,
    description: "Worker points deducted when a report against them is resolved as valid",
  },
  [ReputationConfigKey.LATE_COMPLETION_PENALTY]: {
    value: 10,
    active: true,
    description: "Worker points deducted when a started booking is auto-completed for missing the on-time close-out",
  },
  [ReputationConfigKey.CANCEL_MEDIUM_PENALTY]: {
    value: 10,
    active: true,
    description: "Worker points deducted for cancelling 30 minutes to 2 hours before the booking start time",
  },
  [ReputationConfigKey.CANCEL_SEVERE_PENALTY]: {
    value: 20,
    active: true,
    description: "Worker points deducted for cancelling less than 30 minutes before the booking start time",
  },
  [ReputationConfigKey.CANCEL_NOSHOW_PENALTY]: {
    value: 30,
    active: true,
    description: "Worker points deducted when a worker-no-show dispute resolves in favor of the client",
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd SERVER && npx jest reputation-config.types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add SERVER/src/types/reputation/reputation-config.types.ts SERVER/src/types/reputation/reputation-config.types.test.ts
git commit -m "feat(reputation): add worker scoring config keys"
```

---

### Task 2: New reputation history reasons

**Files:**
- Modify: `SERVER/src/types/reputation/reputation-history.types.ts`

**Interfaces:**
- Produces: `ReputationHistoryReason.PROFILE_COMPLETENESS`, `.REVIEW_RECEIVED`, `.FIVE_STAR_REVIEW`, `.JOB_COMPLETED`, `.REPORT_FILED_VALID`, `.REPORTED_VALID`, `.LATE_COMPLETION`, `.WORKER_CANCEL_MEDIUM`, `.WORKER_CANCEL_SEVERE`, `.WORKER_NO_SHOW` — consumed by every hook task below and by `ReputationHistory` model (which derives its Mongoose enum from `Object.values(ReputationHistoryReason)`, so no model file change is needed).

- [ ] **Step 1: Implement directly (pure enum addition, no separate unit to fail first)**

Edit `SERVER/src/types/reputation/reputation-history.types.ts`:

```ts
export enum ReputationHistoryReason {
  BOOKING_EXPIRY = "booking_expiry",
  WORKER_CANCEL = "worker_cancel",
  CLIENT_LATE_CANCEL = "client_late_cancel",
  LOW_REVIEW = "low_review",
  DAILY_RECOVERY = "daily_recovery",
  MANUAL = "manual",
  PROFILE_COMPLETENESS = "profile_completeness",
  REVIEW_RECEIVED = "review_received",
  FIVE_STAR_REVIEW = "five_star_review",
  JOB_COMPLETED = "job_completed",
  REPORT_FILED_VALID = "report_filed_valid",
  REPORTED_VALID = "reported_valid",
  LATE_COMPLETION = "late_completion",
  WORKER_CANCEL_MEDIUM = "worker_cancel_medium",
  WORKER_CANCEL_SEVERE = "worker_cancel_severe",
  WORKER_NO_SHOW = "worker_no_show",
}
```

- [ ] **Step 2: Verify the project still typechecks**

Run: `cd SERVER && npx tsc --noEmit`
Expected: no new errors (enum-only addition).

- [ ] **Step 3: Commit**

```bash
git add SERVER/src/types/reputation/reputation-history.types.ts
git commit -m "feat(reputation): add worker scoring history reasons"
```

---

### Task 3: `defaultScore` parameter on the reputation adjustment primitives

**Files:**
- Modify: `SERVER/src/repositories/auth/user.repository.ts:535-574` (`adjustReputationScore`)
- Modify: `SERVER/src/services/reputation/reputation.service.ts` (`deductPoints`, `recoverPoints`)
- Modify: `SERVER/src/services/booking/booking-expiration.service.ts:94` (pass `0` — this deduction always targets a worker)
- Modify: `SERVER/src/services/review/review.service.ts:133` (pass `0` — targets the reviewed worker)
- Test: `SERVER/src/repositories/auth/user.repository.reputation.test.ts`

**Interfaces:**
- Consumes: nothing new (extends existing signatures with an optional trailing parameter, fully backward compatible).
- Produces: `userRepository.adjustReputationScore(id, delta, defaultScore = 100)`, `reputationService.deductPoints(userId, points, reason, defaultScore = 100)`, `reputationService.recoverPoints(userId, points, reason, defaultScore = 100)` — every task below that adjusts a **worker's** score must pass `0` as the last argument; calls adjusting a client's score keep the 100 default.

- [ ] **Step 1: Write the failing test**

This codebase has no live-database test infrastructure anywhere (no `mongodb-memory-server`, no test DB in `jest.config.js`) — every existing test either mocks the Mongoose model/repository at the module boundary (e.g. `booking-auto-complete.service.test.ts`) or, for schema-shape checks, constructs a Mongoose document without saving (`user.model.test.ts`). Follow the same convention: mock `User.findByIdAndUpdate` directly rather than hitting a real database.

```ts
// SERVER/src/repositories/auth/user.repository.reputation.test.ts
import { User } from "../../models/auth/user.model";
import { userRepository } from "./user.repository";

jest.mock("../../models/auth/user.model", () => ({
  User: { findByIdAndUpdate: jest.fn() },
}));

const UserMock = User as unknown as { findByIdAndUpdate: jest.Mock };

beforeEach(() => jest.clearAllMocks());

describe("adjustReputationScore defaultScore", () => {
  it("falls back the previous score to 0 when defaultScore=0 and the field is missing", async () => {
    UserMock.findByIdAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ meta_data: {} }),
    });

    const result = await userRepository.adjustReputationScore("u1", 10, 0);

    expect(result).toEqual({ previousScore: 0, newScore: 10 });
  });

  it("falls back the previous score to 100 when defaultScore is omitted", async () => {
    UserMock.findByIdAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ meta_data: {} }),
    });

    const result = await userRepository.adjustReputationScore("u1", -10);

    expect(result).toEqual({ previousScore: 100, newScore: 90 });
  });

  it("bakes the defaultScore into the aggregation pipeline's $ifNull fallback", async () => {
    UserMock.findByIdAndUpdate.mockReturnValue({
      lean: jest
        .fn()
        .mockResolvedValue({ meta_data: { reputation_score: 20 } }),
    });

    await userRepository.adjustReputationScore("u1", 5, 0);

    const [, pipeline] = UserMock.findByIdAndUpdate.mock.calls[0];
    const setStage = pipeline[0].$set["meta_data.reputation_score"];
    const ifNullClause = setStage.$max[1].$min[1].$add[0].$ifNull;
    expect(ifNullClause).toEqual(["$meta_data.reputation_score", 0]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd SERVER && npx jest user.repository.reputation.test.ts`
Expected: FAIL — TypeScript error (3rd argument not accepted yet) for the first two cases, and the third case fails because the current pipeline hardcodes `100` instead of the passed-in default.

- [ ] **Step 3: Implement**

Edit `SERVER/src/repositories/auth/user.repository.ts:535-574`:

```ts
  async adjustReputationScore(
    id: string,
    delta: number,
    defaultScore = 100
  ): Promise<{ newScore: number; previousScore: number } | null> {
    // Atomic read-modify-write: new:false returns the document as it was
    // *before* the update, letting us reconstruct both scores without a
    // second round-trip and without a read→write race condition.
    const before = await User.findByIdAndUpdate(
      id,
      [
        {
          $set: {
            "meta_data.reputation_score": {
              $max: [
                0,
                {
                  $min: [
                    100,
                    {
                      $add: [
                        {
                          $ifNull: [
                            "$meta_data.reputation_score",
                            defaultScore,
                          ],
                        },
                        delta,
                      ],
                    },
                  ],
                },
              ],
            },
          },
        },
      ],
      { new: false, projection: { "meta_data.reputation_score": 1 } }
    ).lean();
    if (!before) return null;
    const previousScore =
      (before as unknown as { meta_data?: { reputation_score?: number } })
        ?.meta_data?.reputation_score ?? defaultScore;
    const newScore = Math.max(0, Math.min(100, previousScore + delta));
    return { newScore, previousScore };
  }
```

Edit `SERVER/src/services/reputation/reputation.service.ts` (`deductPoints`/`recoverPoints`):

```ts
  async deductPoints(
    userId: string,
    points: number,
    reason = ReputationHistoryReason.MANUAL,
    defaultScore = 100
  ): Promise<void> {
    const result = await userRepository.adjustReputationScore(
      userId,
      -points,
      defaultScore
    );
    if (!result) return;
    const { previousScore, newScore } = result;
    await reputationHistoryRepository.create({
      userId,
      delta: newScore - previousScore,
      previousScore,
      newScore,
      reason,
    });

    const warningThreshold = await reputationConfigService.getValue(
      ReputationConfigKey.WARNING_THRESHOLD
    );

    const shouldNotify =
      (previousScore >= warningThreshold && newScore < warningThreshold) ||
      (previousScore < warningThreshold && newScore < previousScore);

    if (shouldNotify) {
      void notificationEventService
        .reputationWarning(userId, newScore)
        .catch((err) =>
          logger.error("Reputation warning notification failed:", err)
        );
    }
  }

  async recoverPoints(
    userId: string,
    points: number,
    reason = ReputationHistoryReason.MANUAL,
    defaultScore = 100
  ): Promise<void> {
    const result = await userRepository.adjustReputationScore(
      userId,
      points,
      defaultScore
    );
    if (!result) return;
    const { previousScore, newScore } = result;
    await reputationHistoryRepository.create({
      userId,
      delta: newScore - previousScore,
      previousScore,
      newScore,
      reason,
    });
  }
```

Edit `SERVER/src/services/booking/booking-expiration.service.ts:94` — add the trailing `0` (this deduction always targets the worker who missed the confirmation deadline):

```ts
          return reputationService.deductPoints(
            workerId,
            points,
            ReputationHistoryReason.BOOKING_EXPIRY,
            0
          );
```

Edit `SERVER/src/services/review/review.service.ts:133` — add the trailing `0` (always targets the reviewed worker):

```ts
          void reputationService.deductPoints(
            bookingWorkerId,
            points,
            ReputationHistoryReason.LOW_REVIEW,
            0
          );
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd SERVER && npx jest user.repository.reputation.test.ts`
Expected: PASS

- [ ] **Step 5: Run full backend typecheck and existing reputation-adjacent tests**

Run: `cd SERVER && npx tsc --noEmit && npx jest booking-status booking-expiration review.service`
Expected: PASS, no regressions.

- [ ] **Step 6: Commit**

```bash
git add SERVER/src/repositories/auth/user.repository.ts SERVER/src/services/reputation/reputation.service.ts SERVER/src/services/booking/booking-expiration.service.ts SERVER/src/services/review/review.service.ts SERVER/src/repositories/auth/user.repository.reputation.test.ts
git commit -m "feat(reputation): support a role-aware default score for missing values"
```

---

### Task 4: Add `occupation`, `personality`, `marital_status` to `worker_profile`

**Files:**
- Modify: `SERVER/src/types/auth/user.types.ts:46-63` (`WorkerProfile` interface)
- Modify: `SERVER/src/models/auth/user.model.ts` (worker_profile schema block)
- Modify: `SERVER/src/validations/user/user.validation.ts:68-105` (`updateWorkerProfileSchema`)
- Modify: `SERVER/src/repositories/auth/user.repository.ts:66-80` (`WORKER_PROFILE_ALLOWED_FIELDS`)
- Test: `SERVER/src/models/auth/user.model.test.ts` (extend existing file)

**Interfaces:**
- Produces: `WorkerProfile.occupation?: string`, `.personality?: string`, `.marital_status?: string` — consumed by Task 8's profile-completeness field list and by the frontend setup form in Task 15.

- [ ] **Step 1: Write the failing test**

`SERVER/src/models/auth/user.model.test.ts` currently has one test that constructs a `User` document without saving or connecting to a database (Mongoose applies schema paths/defaults synchronously on construction) — append a test in the same style, no DB involved:

```ts
it("keeps the new free-text worker_profile fields as provided", () => {
  const user = new User({
    email: "occupation-test@example.com",
    full_name: "Test Worker",
    worker_profile: {
      gender: "OTHER",
      occupation: "Freelance photographer",
      personality: "Cheerful and reliable",
      marital_status: "single",
    },
  });

  expect(user.worker_profile?.occupation).toBe("Freelance photographer");
  expect(user.worker_profile?.personality).toBe("Cheerful and reliable");
  expect(user.worker_profile?.marital_status).toBe("single");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd SERVER && npx jest user.model.test.ts -t "free-text worker_profile"`
Expected: FAIL — fields are stripped by the schema (not declared), so they come back `undefined`.

- [ ] **Step 3: Implement**

Edit `SERVER/src/types/auth/user.types.ts:46-63`:

```ts
export interface WorkerProfile {
  date_of_birth?: Date;
  gender: gender;
  height_cm?: number;
  weight_kg?: number;
  star_sign?: string;
  occupation?: string;
  lifestyle?: string;
  hobbies: string[];
  quote?: string;
  introduction?: string;
  personality?: string;
  marital_status?: string;
  gallery_urls: string[];
  experience?: Experience;
  work_locations?: Array<{
    province_code: number;
    ward_code?: number | null;
    label_snapshot?: string;
  }>;
}
```

Edit `SERVER/src/models/auth/user.model.ts` worker_profile schema block (insert after `star_sign`, and after `introduction`):

```ts
          star_sign: { type: String, default: null },
          occupation: { type: String, default: null },
          lifestyle: { type: String, default: null },
          hobbies: { type: [String], default: [] },
          quote: { type: String, default: null },
          introduction: { type: String, default: null },
          personality: { type: String, default: null },
          marital_status: { type: String, default: null },
          gallery_urls: { type: [String], default: [] },
```

Edit `SERVER/src/validations/user/user.validation.ts:68-105` (`updateWorkerProfileSchema`), inserting alongside the sibling string fields:

```ts
    star_sign: z.string().optional().nullable(),
    occupation: z.string().optional().nullable(),
    lifestyle: z.string().optional().nullable(),
    hobbies: z.array(z.string()).max(30).optional().default([]),
    quote: z.string().optional().nullable(),
    introduction: z.string().optional().nullable(),
    personality: z.string().optional().nullable(),
    marital_status: z.string().optional().nullable(),
    gallery_urls: z.array(z.string()).max(20).optional().default([]),
```

Edit `SERVER/src/repositories/auth/user.repository.ts:66-80`:

```ts
const WORKER_PROFILE_ALLOWED_FIELDS = new Set([
  "date_of_birth",
  "gender",
  "height_cm",
  "weight_kg",
  "star_sign",
  "occupation",
  "lifestyle",
  "hobbies",
  "quote",
  "introduction",
  "personality",
  "marital_status",
  "gallery_urls",
  "experience",
  "title",
  "work_locations",
]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd SERVER && npx jest user.model.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add SERVER/src/types/auth/user.types.ts SERVER/src/models/auth/user.model.ts SERVER/src/validations/user/user.validation.ts SERVER/src/repositories/auth/user.repository.ts SERVER/src/models/auth/user.model.test.ts
git commit -m "feat(worker): add occupation, personality, marital_status profile fields"
```

---

### Task 5: Worker default score = 0 at become-worker / admin creation

**Files:**
- Modify: `SERVER/src/repositories/auth/user.repository.ts:353-409` (`updateWorkerProfile`)
- Modify: `SERVER/src/repositories/auth/user.repository.ts:173-199` (`createByAdmin`)
- Modify: `SERVER/src/models/auth/user.model.ts` (`meta_data` schema — add `reputation_profile_component`)
- Modify: `SERVER/src/types/auth/user.types.ts:106-113,137-144` (`meta_data` shape on `IUser`/`IUserPublic`)
- Test: `SERVER/src/repositories/auth/user.repository.become-worker.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: on first `addWorkerRole` transition, `meta_data.reputation_score` and `meta_data.reputation_profile_component` are set to `0`; `createByAdmin` sets `reputation_score: 0` when `data.roles` includes `worker`. Task 7 relies on `meta_data.reputation_profile_component` existing on the schema.

- [ ] **Step 1: Write the failing test**

Same convention as Task 3: mock the Mongoose `User` model rather than connecting to a real database. `User` needs to act both as a constructor (for `createByAdmin`) and expose the static `findByIdAndUpdate` (for `updateWorkerProfile`) — a plain function object can carry both.

```ts
// SERVER/src/repositories/auth/user.repository.become-worker.test.ts
import { User } from "../../models/auth/user.model";
import { userRepository } from "./user.repository";
import { UserRole, UserStatus, gender } from "../../types/auth/user.types";

jest.mock("../../models/auth/user.model", () => {
  const MockUser = jest.fn().mockImplementation(function (
    this: Record<string, unknown>,
    data: Record<string, unknown>
  ) {
    Object.assign(this, data);
    this.save = jest.fn().mockImplementation(async () => this);
  });
  return {
    User: Object.assign(MockUser, { findByIdAndUpdate: jest.fn() }),
  };
});

const UserMock = User as unknown as jest.Mock & { findByIdAndUpdate: jest.Mock };

beforeEach(() => jest.clearAllMocks());

it("resets reputation_score and profile component to 0 when addWorkerRole is set", async () => {
  UserMock.findByIdAndUpdate.mockResolvedValue({
    roles: [UserRole.CLIENT, UserRole.WORKER],
    meta_data: { reputation_score: 0, reputation_profile_component: 0 },
  });

  await userRepository.updateWorkerProfile(
    "u1",
    { gender: gender.OTHER },
    { addWorkerRole: true, setLastActiveRole: UserRole.WORKER }
  );

  const [, pipeline] = UserMock.findByIdAndUpdate.mock.calls[0];
  const setStage = pipeline[0].$set;
  expect(setStage["meta_data.reputation_score"]).toBe(0);
  expect(setStage["meta_data.reputation_profile_component"]).toBe(0);
});

it("does not touch reputation_score fields on a plain profile edit", async () => {
  UserMock.findByIdAndUpdate.mockResolvedValue({
    meta_data: { reputation_score: 42 },
  });

  await userRepository.updateWorkerProfile("u1", { lifestyle: "Active" });

  const [, pipeline] = UserMock.findByIdAndUpdate.mock.calls[0];
  const setStage = pipeline[0].$set;
  expect(setStage["meta_data.reputation_score"]).toBeUndefined();
  expect(setStage["meta_data.reputation_profile_component"]).toBeUndefined();
});

it("createByAdmin defaults reputation_score to 0 for worker roles, 100 otherwise", async () => {
  const worker = (await userRepository.createByAdmin({
    email: "admin-worker@test.com",
    password_hash: "hash",
    full_name: "Admin Worker",
    roles: [UserRole.CLIENT, UserRole.WORKER],
    last_active_role: UserRole.WORKER,
    status: UserStatus.ACTIVE,
    worker_profile: { gender: gender.OTHER },
  })) as unknown as { meta_data: { reputation_score: number } };
  expect(worker.meta_data.reputation_score).toBe(0);

  const client = (await userRepository.createByAdmin({
    email: "admin-client@test.com",
    password_hash: "hash",
    full_name: "Admin Client",
    roles: [UserRole.CLIENT],
    last_active_role: UserRole.CLIENT,
    status: UserStatus.ACTIVE,
    worker_profile: null,
  })) as unknown as { meta_data: { reputation_score: number } };
  expect(client.meta_data.reputation_score).toBe(100);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd SERVER && npx jest user.repository.become-worker.test.ts`
Expected: FAIL — the `addWorkerRole` pipeline doesn't set the two `meta_data.*` fields yet, and `createByAdmin` always hardcodes `reputation_score: 100`.

- [ ] **Step 3: Implement**

Edit `SERVER/src/models/auth/user.model.ts` `meta_data` schema block — add next to `reputation_score`:

```ts
        reputation_score: {
          type: Number,
          default: 100,
        },
        reputation_profile_component: {
          type: Number,
          default: 0,
        },
```

Edit `SERVER/src/types/auth/user.types.ts` — both `meta_data` blocks (`IUser` around line 106, `IUserPublic` around line 137):

```ts
  meta_data: {
    reputation_score: number;
    reputation_profile_component: number;
    pricing_plan_code: PricingPlanCode;
    pricing_started_at: Date | null;
    pricing_expires_at: Date | null;
    onboarding_done: boolean;
    locale?: string;
  };
```

Edit `SERVER/src/repositories/auth/user.repository.ts:353-409` (`updateWorkerProfile`), extending the `addWorkerRole` branch:

```ts
    if (options?.addWorkerRole) {
      setStage.roles = {
        $setUnion: [{ $ifNull: ["$roles", []] }, [UserRole.WORKER]],
      };
      // First time becoming a worker: reputation starts fresh under the
      // worker-only build-from-0 model, discarding whatever client score
      // existed. Accepted tradeoff — see design spec, "Dual-role field".
      setStage["meta_data.reputation_score"] = 0;
      setStage["meta_data.reputation_profile_component"] = 0;
    }
```

Edit `SERVER/src/repositories/auth/user.repository.ts:173-199` (`createByAdmin`):

```ts
  async createByAdmin(data: CreateByAdminInput): Promise<IUserDocument> {
    const isWorker = data.roles.includes(UserRole.WORKER);
    const user = new User({
      email: data.email.toLowerCase().trim(),
      password_hash: data.password_hash,
      full_name: data.full_name,
      phone: data.phone ?? null,
      avatar: data.avatar ?? null,
      roles: data.roles,
      last_active_role: data.last_active_role,
      status: data.status,
      verify_email: true,
      created_by_admin: true,
      worker_profile: data.worker_profile ?? null,
      meta_data: {
        reputation_score: isWorker ? 0 : 100,
        reputation_profile_component: 0,
        pricing_plan_code: PricingPlanCode.STANDARD,
        pricing_started_at: null,
        pricing_expires_at: null,
        onboarding_done: true,
        locale: "vi",
      },
      created_at: new Date(),
      last_login: null,
    });

    return user.save();
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd SERVER && npx jest user.repository.become-worker.test.ts`
Expected: PASS

- [ ] **Step 5: Run broader regression check**

Run: `cd SERVER && npx tsc --noEmit && npx jest user.repository user.model`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add SERVER/src/models/auth/user.model.ts SERVER/src/types/auth/user.types.ts SERVER/src/repositories/auth/user.repository.ts SERVER/src/repositories/auth/user.repository.become-worker.test.ts
git commit -m "feat(reputation): start worker reputation at 0 on become-worker/admin create"
```

---

### Task 6: Expose real `reputation_score` on the public worker detail endpoint

This is the literal bug reported at the start of this work: `GET /api/workers/:id` never sends `meta_data.reputation_score` at all — `WorkerDetailResponse.user` only has `id/full_name/avatar/email`. The frontend's `getReputationScore(undefined)` (`pr1as-client/lib/utils/reputation.ts`) always falls back to its hardcoded `DEFAULT_REPUTATION_SCORE = 100`, so every worker profile page shows "100" regardless of the real value in the database.

**Files:**
- Modify: `SERVER/src/types/worker/worker.types.ts:38-44` (`WorkerDetailResponse`)
- Modify: `SERVER/src/services/worker/worker.service.ts:277-289` (`getWorkerById` return object)
- Test: `SERVER/src/services/worker/worker.service.test.ts` (extend existing file)

**Interfaces:**
- Consumes: `user.meta_data?.reputation_score` (already on `IUserDocument` from Task 5).
- Produces: `WorkerDetailResponse.user.meta_data.reputation_score: number` — consumed by the already-existing frontend code at `pr1as-client/components/worker/worker-profile-header.tsx:83` and `pr1as-client/app/worker/[id]/page.tsx:246` (no frontend change needed, it already reads this path).

- [ ] **Step 1: Write the failing test**

Read `SERVER/src/services/worker/worker.service.test.ts` first to match its existing mocking setup, then add:

```ts
it("returns the worker's real reputation_score in the detail response", async () => {
  // Arrange mocks per the file's existing pattern: userRepository.findById
  // resolves a worker with worker_profile set and meta_data.reputation_score: 42.
  const result = await workerService.getWorkerById(workerId);
  expect(result.user.meta_data.reputation_score).toBe(42);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd SERVER && npx jest worker.service.test.ts -t "real reputation_score"`
Expected: FAIL — TypeScript error, `result.user.meta_data` does not exist on the current `WorkerDetailResponse` type.

- [ ] **Step 3: Implement**

Edit `SERVER/src/types/worker/worker.types.ts:38-44`:

```ts
export interface WorkerDetailResponse {
  user: {
    id: string;
    full_name: string | null;
    avatar: string | null;
    email: string;
    meta_data: {
      reputation_score: number;
    };
  };
```

Edit `SERVER/src/services/worker/worker.service.ts:277-289` (inside the return statement of `getWorkerById`):

```ts
    return {
      user: {
        id: user._id.toString(),
        full_name: user.full_name ?? null,
        avatar: user.avatar ?? null,
        email: user.email,
        meta_data: {
          reputation_score: user.meta_data?.reputation_score ?? 0,
        },
      },
      worker_profile: workerProfile,
      services,
      review_stats: reviewStats,
      reviews,
    };
```

Note: the fallback here is `?? 0`, not `?? 100` — `getWorkerById` only ever returns workers (`if (!user.worker_profile) throw ...` a few lines above), so a missing score always means an unmigrated/edge-case worker record, which should read as the worker-track default.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd SERVER && npx jest worker.service.test.ts`
Expected: PASS

- [ ] **Step 5: Manual verification**

Run the dev server (`npm run dev` in `SERVER/`), call `GET /api/workers/:id` for a worker with a known non-100 `meta_data.reputation_score` in the DB, confirm the response body now includes `user.meta_data.reputation_score` matching that value (not 100).

- [ ] **Step 6: Commit**

```bash
git add SERVER/src/types/worker/worker.types.ts SERVER/src/services/worker/worker.service.ts SERVER/src/services/worker/worker.service.test.ts
git commit -m "fix(worker): return the worker's actual reputation_score from GET /api/workers/:id"
```

---

### Task 7: Role-aware fallback at ambiguous read sites, worker-only sites default to 0

**Files:**
- Modify: `SERVER/src/utils/user.helper.ts` (`toPublicUser`)
- Modify: `SERVER/src/services/comment/comment.service.ts:88`
- Modify: `SERVER/src/repositories/worker/worker-service.repository.ts:645,688,820` (worker-only aggregation pipelines)
- Test: `SERVER/src/utils/user.helper.test.ts` (new), extend `SERVER/src/services/comment/comment.service.test.ts` if it exists (check first with `find SERVER/src -iname "comment.service.test.ts"`)

**Interfaces:**
- Consumes: `user.roles` (already available on every fetched user doc).
- Produces: `toPublicUser` fallback is `0` for users with the `worker` role, `100` otherwise.

- [ ] **Step 1: Write the failing test**

```ts
// SERVER/src/utils/user.helper.test.ts
import { toPublicUser } from "./user.helper";
import { UserRole, UserStatus, IUserDocument } from "../types/auth/user.types";

const baseUser = (overrides: Partial<IUserDocument>): IUserDocument =>
  ({
    _id: { toString: () => "u1" },
    email: "a@test.com",
    avatar: null,
    full_name: "Test",
    phone: null,
    roles: [UserRole.CLIENT],
    status: UserStatus.ACTIVE,
    last_active_role: UserRole.CLIENT,
    verify_email: true,
    created_by_admin: false,
    worker_profile: null,
    client_profile: null,
    created_at: new Date(),
    last_login: null,
    coords: { latitude: null, longitude: null },
    meta_data: {},
    ...overrides,
  }) as unknown as IUserDocument;

describe("toPublicUser reputation fallback", () => {
  it("falls back to 0 for a worker with no stored score", () => {
    const user = baseUser({ roles: [UserRole.CLIENT, UserRole.WORKER] });
    expect(toPublicUser(user).meta_data.reputation_score).toBe(0);
  });

  it("falls back to 100 for a client with no stored score", () => {
    const user = baseUser({ roles: [UserRole.CLIENT] });
    expect(toPublicUser(user).meta_data.reputation_score).toBe(100);
  });

  it("prefers the stored score over any fallback", () => {
    const user = baseUser({
      roles: [UserRole.WORKER],
      meta_data: { reputation_score: 55 },
    });
    expect(toPublicUser(user).meta_data.reputation_score).toBe(55);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd SERVER && npx jest user.helper.test.ts`
Expected: FAIL — the worker-with-no-score case currently returns 100.

- [ ] **Step 3: Implement**

Edit `SERVER/src/utils/user.helper.ts`:

```ts
import { IUserDocument, IUserPublic, UserRole } from "../types/auth/user.types";
import { PricingPlanCode } from "../constants/pricing";
import { AuthRequest } from "../middleware/auth";
import { AppError } from "./AppError";
import { AUTH_MESSAGES } from "../constants/messages";

export const toPublicUser = (user: IUserDocument): IUserPublic => {
  const defaultReputationScore = user.roles?.includes(UserRole.WORKER)
    ? 0
    : 100;

  return {
    id: user._id.toString(),
    email: user.email,
    avatar: user.avatar,
    full_name: user.full_name,
    phone: user.phone,
    roles: user.roles,
    status: user.status,
    last_active_role: user.last_active_role,
    verify_email: user.verify_email,
    created_by_admin: user.created_by_admin ?? false,
    worker_profile: user.worker_profile,
    client_profile: user.client_profile,
    created_at: user.created_at,
    last_login: user.last_login,
    coords: user.coords,
    meta_data: {
      reputation_score:
        user.meta_data?.reputation_score ?? defaultReputationScore,
      reputation_profile_component:
        user.meta_data?.reputation_profile_component ?? 0,
      pricing_plan_code:
        user.meta_data?.pricing_plan_code ?? PricingPlanCode.STANDARD,
      pricing_started_at: user.meta_data?.pricing_started_at ?? null,
      pricing_expires_at: user.meta_data?.pricing_expires_at ?? null,
      onboarding_done: user.meta_data?.onboarding_done ?? false,
    },
  };
};
```

Edit `SERVER/src/services/comment/comment.service.ts:88`:

```ts
    const commenter = await userRepository.findById(userId);
    const defaultCommenterReputation = commenter?.roles?.includes(
      UserRole.WORKER
    )
      ? 0
      : 100;
    const reputation =
      commenter?.meta_data?.reputation_score ?? defaultCommenterReputation;
```

`comment.service.ts` currently imports only `IUserDocument` from `"../../types/auth/user.types"` — change that import line to also bring in `UserRole`:

```ts
import { IUserDocument, UserRole } from "../../types/auth/user.types";
```

Edit `SERVER/src/repositories/worker/worker-service.repository.ts` at the three worker-only aggregation sites (these pipelines always operate on `$worker`/a worker row, confirmed by the `$match: {"worker.worker_profile": {$ne: null}}` stage earlier in the same pipeline — change `100` to `0`):

Line 645:
```ts
                  { $ifNull: ["$worker.meta_data.reputation_score", 0] },
```

Line 688:
```ts
              reputation_score: {
                $ifNull: ["$worker.meta_data.reputation_score", 0],
              },
```

Line 820:
```ts
          reputation_score: { $ifNull: ["$reputation_score", 0] },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd SERVER && npx jest user.helper.test.ts comment.service`
Expected: PASS

- [ ] **Step 5: Run worker discovery/suggestion tests for regressions**

Run: `cd SERVER && npx jest worker-service.repository worker-sort`
Expected: PASS (values changing from 100→0 only affects the fallback for missing scores; every real worker now has an explicit score per Task 5, so existing tests using explicit scores are unaffected).

- [ ] **Step 6: Commit**

```bash
git add SERVER/src/utils/user.helper.ts SERVER/src/services/comment/comment.service.ts SERVER/src/repositories/worker/worker-service.repository.ts SERVER/src/utils/user.helper.test.ts
git commit -m "fix(reputation): role-aware fallback score, 0 for workers instead of 100"
```

---

### Task 8: Daily recovery excludes workers

**Files:**
- Modify: `SERVER/src/repositories/auth/user.repository.ts:592-601` (`findReputationRecoveryCandidates`)
- Test: extend an existing repository test file or add `SERVER/src/repositories/auth/user.repository.recovery.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `findReputationRecoveryCandidates()` only returns non-worker (client) users, so `reputationService.bulkDailyRecovery()` (unchanged) stops touching worker scores.

- [ ] **Step 1: Write the failing test**

Same mocked-model convention as Tasks 3 and 5 — mock `User.find` and assert the query filter, rather than seeding a real database:

```ts
// SERVER/src/repositories/auth/user.repository.recovery.test.ts
import { User } from "../../models/auth/user.model";
import { userRepository } from "./user.repository";
import { UserRole } from "../../types/auth/user.types";

jest.mock("../../models/auth/user.model", () => ({
  User: { find: jest.fn() },
}));

const UserMock = User as unknown as { find: jest.Mock };

beforeEach(() => jest.clearAllMocks());

it("excludes workers from the recovery-candidates query", async () => {
  const leanMock = jest.fn().mockResolvedValue([]);
  const limitMock = jest.fn().mockReturnValue({ lean: leanMock });
  const selectMock = jest.fn().mockReturnValue({ limit: limitMock });
  UserMock.find.mockReturnValue({ select: selectMock });

  await userRepository.findReputationRecoveryCandidates();

  expect(UserMock.find).toHaveBeenCalledWith({
    "meta_data.reputation_score": { $lt: 100 },
    roles: { $ne: UserRole.WORKER },
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd SERVER && npx jest user.repository.recovery.test.ts`
Expected: FAIL — `User.find` is currently called with only the `reputation_score` filter, missing the `roles` exclusion.

- [ ] **Step 3: Implement**

Edit `SERVER/src/repositories/auth/user.repository.ts:592-601`:

```ts
  async findReputationRecoveryCandidates(): Promise<
    Array<{ _id: Types.ObjectId; meta_data?: { reputation_score?: number } }>
  > {
    return User.find({
      "meta_data.reputation_score": { $lt: 100 },
      roles: { $ne: UserRole.WORKER },
    })
      .select("_id meta_data.reputation_score")
      .limit(500)
      .lean() as Promise<
      Array<{ _id: Types.ObjectId; meta_data?: { reputation_score?: number } }>
    >;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd SERVER && npx jest user.repository.recovery.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add SERVER/src/repositories/auth/user.repository.ts SERVER/src/repositories/auth/user.repository.recovery.test.ts
git commit -m "fix(reputation): exclude workers from daily recovery job"
```

---

### Task 9: Profile completeness scoring

**Files:**
- Create: `SERVER/src/services/reputation/worker-profile-completeness.ts`
- Modify: `SERVER/src/repositories/auth/user.repository.ts` (add `setReputationProfileComponent`)
- Modify: `SERVER/src/services/reputation/reputation.service.ts` (add `syncWorkerProfileCompleteness`)
- Modify: `SERVER/src/services/user/user.service.ts:256-278,280-314` (`updateWorkerProfile`, `becomeWorker`)
- Modify: `SERVER/src/services/user/user.service.ts:452-522` (`createUserByAdmin`)
- Test: `SERVER/src/services/reputation/worker-profile-completeness.test.ts`

**Interfaces:**
- Consumes: `ReputationConfigKey.PROFILE_PHOTOS_BONUS`, `.MIN_PROFILE_PHOTOS_THRESHOLD`, `.PROFILE_INFO_FIELD_BONUS` (Task 1); `userRepository.adjustReputationScore(id, delta, 0)` (Task 3); `WorkerProfile.occupation/personality/marital_status` (Task 4); `meta_data.reputation_profile_component` (Task 5).
- Produces: `computeProfileCompletenessScore(profile, { photoBonus, minPhotos, perFieldBonus }): number` (pure, exported for the test); `reputationService.syncWorkerProfileCompleteness(user: IUserDocument): Promise<void>` — called from `updateWorkerProfile`, `becomeWorker`, and `createUserByAdmin`.

- [ ] **Step 1: Write the failing test for the pure scoring function**

```ts
// SERVER/src/services/reputation/worker-profile-completeness.test.ts
import { computeProfileCompletenessScore } from "./worker-profile-completeness";
import { WorkerProfile, gender } from "../../types/auth/user.types";

const CONFIG = { photoBonus: 10, minPhotos: 5, perFieldBonus: 5 };

const emptyProfile: WorkerProfile = { gender: gender.OTHER, hobbies: [], gallery_urls: [] };

describe("computeProfileCompletenessScore", () => {
  it("scores 0 for a completely empty profile", () => {
    expect(computeProfileCompletenessScore(null, CONFIG)).toBe(0);
    expect(computeProfileCompletenessScore(emptyProfile, CONFIG)).toBe(0);
  });

  it("awards the photo bonus only once the gallery meets the threshold", () => {
    const under = {
      ...emptyProfile,
      gallery_urls: ["a", "b", "c", "d"],
    };
    const atThreshold = {
      ...emptyProfile,
      gallery_urls: ["a", "b", "c", "d", "e"],
    };
    expect(computeProfileCompletenessScore(under, CONFIG)).toBe(0);
    expect(computeProfileCompletenessScore(atThreshold, CONFIG)).toBe(10);
  });

  it("awards 5 points per filled info field, out of 10 possible fields", () => {
    const profile: WorkerProfile = {
      ...emptyProfile,
      introduction: "hi",
      date_of_birth: new Date("2000-01-01"),
      height_cm: 170,
      weight_kg: 60,
      star_sign: "Leo",
      occupation: "Photographer",
      lifestyle: "Active",
      hobbies: ["reading"],
      personality: "Cheerful",
      marital_status: "single",
    };
    expect(computeProfileCompletenessScore(profile, CONFIG)).toBe(50);
  });

  it("caps total at photo bonus + all 10 fields (60)", () => {
    const full: WorkerProfile = {
      gender: gender.OTHER,
      introduction: "hi",
      date_of_birth: new Date("2000-01-01"),
      height_cm: 170,
      weight_kg: 60,
      star_sign: "Leo",
      occupation: "Photographer",
      lifestyle: "Active",
      hobbies: ["reading"],
      personality: "Cheerful",
      marital_status: "single",
      gallery_urls: ["a", "b", "c", "d", "e", "f"],
    };
    expect(computeProfileCompletenessScore(full, CONFIG)).toBe(60);
  });

  it("does not count an empty string or empty array as filled", () => {
    const profile: WorkerProfile = {
      ...emptyProfile,
      introduction: "",
      hobbies: [],
    };
    expect(computeProfileCompletenessScore(profile, CONFIG)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd SERVER && npx jest worker-profile-completeness.test.ts`
Expected: FAIL — module `./worker-profile-completeness` does not exist.

- [ ] **Step 3: Implement the pure function**

Create `SERVER/src/services/reputation/worker-profile-completeness.ts`:

```ts
import { WorkerProfile } from "../../types/auth/user.types";

// The 10 free-text/simple fields that make up "đủ thông tin". gallery_urls is
// scored separately (photo bonus), not counted here.
const PROFILE_INFO_FIELDS = [
  "introduction",
  "date_of_birth",
  "height_cm",
  "weight_kg",
  "star_sign",
  "occupation",
  "lifestyle",
  "hobbies",
  "personality",
  "marital_status",
] as const;

export interface ProfileCompletenessConfig {
  photoBonus: number;
  minPhotos: number;
  perFieldBonus: number;
}

const isFilled = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

export const computeProfileCompletenessScore = (
  profile: WorkerProfile | null | undefined,
  config: ProfileCompletenessConfig
): number => {
  if (!profile) return 0;

  const hasEnoughPhotos =
    (profile.gallery_urls?.length ?? 0) >= config.minPhotos;
  const filledFieldCount = PROFILE_INFO_FIELDS.filter((field) =>
    isFilled((profile as unknown as Record<string, unknown>)[field])
  ).length;

  return (
    (hasEnoughPhotos ? config.photoBonus : 0) +
    filledFieldCount * config.perFieldBonus
  );
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd SERVER && npx jest worker-profile-completeness.test.ts`
Expected: PASS

- [ ] **Step 5: Add the repository setter**

Edit `SERVER/src/repositories/auth/user.repository.ts`, add near `adjustReputationScore`:

```ts
  async setReputationProfileComponent(
    id: string,
    value: number
  ): Promise<void> {
    await User.findByIdAndUpdate(id, {
      "meta_data.reputation_profile_component": value,
    });
  }
```

- [ ] **Step 6: Wire the sync method into `ReputationService`**

Edit `SERVER/src/services/reputation/reputation.service.ts` — add imports and method:

```ts
import { userRepository } from "../../repositories/auth/user.repository";
import { reputationHistoryRepository } from "../../repositories/reputation/reputation-history.repository";
import { notificationEventService } from "../notification";
import { reputationConfigService } from "./reputation-config.service";
import { ReputationConfigKey } from "../../types/reputation/reputation-config.types";
import {
  ReputationHistoryQuery,
  ReputationHistoryReason,
} from "../../types/reputation/reputation-history.types";
import { PaginationHelper } from "../../utils";
import { logger } from "../../utils/logger";
import { IUserDocument, UserRole } from "../../types/auth/user.types";
import { computeProfileCompletenessScore } from "./worker-profile-completeness";

export class ReputationService {
  // ...existing deductPoints/recoverPoints/bulkDailyRecovery/listHistory unchanged...

  async syncWorkerProfileCompleteness(user: IUserDocument): Promise<void> {
    if (!user.roles?.includes(UserRole.WORKER)) return;

    const [photoBonus, minPhotos, perFieldBonus] = await Promise.all([
      reputationConfigService.getValue(
        ReputationConfigKey.PROFILE_PHOTOS_BONUS
      ),
      reputationConfigService.getValue(
        ReputationConfigKey.MIN_PROFILE_PHOTOS_THRESHOLD
      ),
      reputationConfigService.getValue(
        ReputationConfigKey.PROFILE_INFO_FIELD_BONUS
      ),
    ]);

    const newComponent = computeProfileCompletenessScore(
      user.worker_profile,
      { photoBonus, minPhotos, perFieldBonus }
    );
    const previousComponent =
      user.meta_data?.reputation_profile_component ?? 0;
    const delta = newComponent - previousComponent;
    if (delta === 0) return;

    const userId = user._id.toString();
    const result = await userRepository.adjustReputationScore(
      userId,
      delta,
      0
    );
    if (!result) return;

    await userRepository.setReputationProfileComponent(userId, newComponent);

    const { previousScore, newScore } = result;
    if (newScore === previousScore) return;
    await reputationHistoryRepository.create({
      userId,
      delta: newScore - previousScore,
      previousScore,
      newScore,
      reason: ReputationHistoryReason.PROFILE_COMPLETENESS,
    });
  }
}
```

- [ ] **Step 7: Hook into profile update, become-worker, and admin create**

Edit `SERVER/src/services/user/user.service.ts` — add import:

```ts
import { reputationService } from "../reputation/reputation.service";
```

In `updateWorkerProfile` (around line 256-278), after the existing `updateWorkerProfile` repository call succeeds:

```ts
  async updateWorkerProfile(
    userId: string,
    input: UpdateWorkerProfileSchemaType["worker_profile"]
  ): Promise<IUserDocument> {
    const currentUser = await userRepository.findById(userId); // DB call 1
    if (!currentUser) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    if (!currentUser.roles.includes(UserRole.WORKER)) {
      throw AppError.forbidden(USER_MESSAGES.WORKER_ROLE_REQUIRED);
    }

    const { coords, profileFields } = this.splitWorkerProfileInput(input);

    const user = await userRepository.updateWorkerProfile(
      // DB call 2 (compound atomic)
      userId,
      profileFields,
      { coords }
    );

    if (!user) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    void reputationService
      .syncWorkerProfileCompleteness(user)
      .catch((error) =>
        logger.error("Reputation profile-completeness sync failed:", error)
      );

    return user;
  }
```

In `becomeWorker` (around line 280-314), after the repository call:

```ts
    const user = await userRepository.updateWorkerProfile(
      userId,
      profileFields,
      {
        coords,
        addWorkerRole: !alreadyWorker,
        setLastActiveRole: UserRole.WORKER,
      }
    );

    if (!user) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    void reputationService
      .syncWorkerProfileCompleteness(user)
      .catch((error) =>
        logger.error("Reputation profile-completeness sync failed:", error)
      );

    logger.info("AUDIT user become worker confirmed", {
```

In `createUserByAdmin` (around line 452-522), after the `isWorker` block that creates the point wallet/services:

```ts
    if (isWorker) {
      await workerPointWalletRepository.findOrCreate(userId);
      await workerServiceRepository.upsertManyForWorker(
        userId,
        workerServicePayloads,
        new Date()
      );
      void reputationService
        .syncWorkerProfileCompleteness(user)
        .catch((error) =>
          logger.error(
            "Reputation profile-completeness sync failed for admin-created worker:",
            error
          )
        );
    }
```

- [ ] **Step 8: Run tests**

Run: `cd SERVER && npx jest worker-profile-completeness user.service reputation.service`
Expected: PASS (write a quick smoke test in `user.service.test.ts` if one exists covering `updateWorkerProfile`/`becomeWorker`, following that file's existing mock style for `reputationService`).

- [ ] **Step 9: Full typecheck**

Run: `cd SERVER && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add SERVER/src/services/reputation/worker-profile-completeness.ts SERVER/src/services/reputation/worker-profile-completeness.test.ts SERVER/src/services/reputation/reputation.service.ts SERVER/src/repositories/auth/user.repository.ts SERVER/src/services/user/user.service.ts
git commit -m "feat(reputation): award worker points for profile completeness"
```

---

### Task 10: Review-received and five-star bonuses, low-review deduction reuse

**Files:**
- Modify: `SERVER/src/services/review/review.service.ts:126-140`

**Interfaces:**
- Consumes: `ReputationConfigKey.REVIEW_RECEIVED_BONUS`, `.FIVE_STAR_REVIEW_BONUS` (Task 1); `reputationService.recoverPoints(id, points, reason, 0)`.
- Produces: nothing consumed by later tasks (leaf hook).

- [ ] **Step 1: Write the failing test**

Read `SERVER/src/services/review/review.service.ts`'s existing test file if present (`find SERVER/src -iname "review.service.test.ts"`); if none exists, create one following the mocking style of `booking-auto-complete.service.test.ts` (Jest module mocks for repositories/services):

```ts
// SERVER/src/services/review/review.service.test.ts
import { ReviewService } from "./review.service";
import { reviewRepository } from "../../repositories/review/review.repository";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { reputationService } from "../reputation/reputation.service";
import { reputationConfigService } from "../reputation/reputation-config.service";
import { BookingStatus } from "../../constants/booking";
import { ReviewType } from "../../constants/review";
import { ReputationHistoryReason } from "../../types/reputation/reputation-history.types";

jest.mock("../../repositories/review/review.repository", () => ({
  reviewRepository: {
    findByBookingId: jest.fn(),
    create: jest.fn(),
  },
}));
jest.mock("../../repositories/booking/booking.repository", () => ({
  bookingRepository: { findById: jest.fn() },
}));
jest.mock("../notification", () => ({
  notificationEventService: { reviewCreated: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("../reputation/reputation.service", () => ({
  reputationService: { deductPoints: jest.fn(), recoverPoints: jest.fn() },
}));
jest.mock("../reputation/reputation-config.service", () => ({
  reputationConfigService: { getValue: jest.fn(), getActiveValue: jest.fn() },
}));

const booking = {
  _id: "b1",
  status: BookingStatus.COMPLETED,
  client_id: "client1",
  worker_id: "worker1",
};

const bookingRepo = bookingRepository as jest.Mocked<typeof bookingRepository>;
const reviewRepo = reviewRepository as jest.Mocked<typeof reviewRepository>;
const repService = reputationService as jest.Mocked<typeof reputationService>;
const repConfig = reputationConfigService as jest.Mocked<
  typeof reputationConfigService
>;

const service = new ReviewService();

beforeEach(() => {
  jest.clearAllMocks();
  bookingRepo.findById.mockResolvedValue(booking as never);
  reviewRepo.findByBookingId.mockResolvedValue(null);
  reviewRepo.create.mockImplementation(async (data) => data as never);
  repConfig.getValue.mockResolvedValue(2); // LOW_REVIEW_THRESHOLD
  repConfig.getActiveValue.mockImplementation(async (key) => {
    if (key === "review_received_bonus" as never) return 5;
    if (key === "five_star_review_bonus" as never) return 5;
    if (key === "low_review_deduction" as never) return 10;
    return null;
  });
});

const input = {
  booking_id: "b1",
  worker_id: "worker1",
  client_id: "client1",
  review_type: ReviewType.CLIENT_TO_WORKER,
  rating: 5,
  rating_details: {
    professionalism: 5,
    punctuality: 5,
    communication: 5,
    service_quality: 5,
  },
  comment: "Great service, would book again",
} as never;

it("awards review-received and five-star bonuses for a 5-star review", async () => {
  await service.createReview(input, "client1");
  await new Promise((r) => setTimeout(r, 0)); // flush fire-and-forget promises

  expect(repService.recoverPoints).toHaveBeenCalledWith(
    "worker1",
    5,
    ReputationHistoryReason.REVIEW_RECEIVED,
    0
  );
  expect(repService.recoverPoints).toHaveBeenCalledWith(
    "worker1",
    5,
    ReputationHistoryReason.FIVE_STAR_REVIEW,
    0
  );
  expect(repService.deductPoints).not.toHaveBeenCalled();
});

it("deducts for a low review and does not award the five-star bonus", async () => {
  await service.createReview({ ...input, rating: 1 } as never, "client1");
  await new Promise((r) => setTimeout(r, 0));

  expect(repService.recoverPoints).toHaveBeenCalledWith(
    "worker1",
    5,
    ReputationHistoryReason.REVIEW_RECEIVED,
    0
  );
  expect(repService.recoverPoints).not.toHaveBeenCalledWith(
    "worker1",
    5,
    ReputationHistoryReason.FIVE_STAR_REVIEW,
    0
  );
  expect(repService.deductPoints).toHaveBeenCalledWith(
    "worker1",
    10,
    ReputationHistoryReason.LOW_REVIEW,
    0
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd SERVER && npx jest review.service.test.ts`
Expected: FAIL — `recoverPoints` for `REVIEW_RECEIVED`/`FIVE_STAR_REVIEW` is never called yet.

- [ ] **Step 3: Implement**

Edit `SERVER/src/services/review/review.service.ts:121-141` (the block right after `reviewRepository.create`):

```ts
    const review = await reviewRepository.create(reviewData);

    void notificationEventService
      .reviewCreated(review, userId)
      .catch((error) => logger.error("Review notification failed:", error));

    void reputationConfigService
      .getActiveValue(ReputationConfigKey.REVIEW_RECEIVED_BONUS)
      .then((points) => {
        if (points === null) return;
        return reputationService.recoverPoints(
          bookingWorkerId,
          points,
          ReputationHistoryReason.REVIEW_RECEIVED,
          0
        );
      })
      .catch((err) =>
        logger.error("Reputation bonus after review received failed:", err)
      );

    if (input.rating === REVIEW_LIMITS.MAX_RATING) {
      void reputationConfigService
        .getActiveValue(ReputationConfigKey.FIVE_STAR_REVIEW_BONUS)
        .then((points) => {
          if (points === null) return;
          return reputationService.recoverPoints(
            bookingWorkerId,
            points,
            ReputationHistoryReason.FIVE_STAR_REVIEW,
            0
          );
        })
        .catch((err) =>
          logger.error("Reputation bonus after 5-star review failed:", err)
        );
    }

    void Promise.all([
      reputationConfigService.getValue(ReputationConfigKey.LOW_REVIEW_THRESHOLD),
      reputationConfigService.getActiveValue(ReputationConfigKey.LOW_REVIEW_DEDUCTION),
    ])
      .then(([threshold, points]) => {
        if (points !== null && input.rating <= threshold) {
          void reputationService.deductPoints(
            bookingWorkerId,
            points,
            ReputationHistoryReason.LOW_REVIEW,
            0
          );
        }
      })
      .catch((err) => logger.error("Reputation deduction after low review failed:", err));

    return review;
```

Add `REVIEW_LIMITS` to the existing import from `"../../constants/validation"` — check the top of the file: it already imports `VALIDATION_LIMITS` from `"../../constants/validation"`; add a separate import for `REVIEW_LIMITS` from `"../../constants/review"` where `ReviewStatus`/`ReviewType` are already imported:

```ts
import { ReputationConfigKey } from "../../types/reputation/reputation-config.types";
```
(already imported) — and change:
```ts
import { ReviewStatus, ReviewType } from "../../constants/review";
```
to:
```ts
import { ReviewStatus, ReviewType, REVIEW_LIMITS } from "../../constants/review";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd SERVER && npx jest review.service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add SERVER/src/services/review/review.service.ts SERVER/src/services/review/review.service.test.ts
git commit -m "feat(reputation): award review-received and five-star bonuses to workers"
```

---

### Task 11: Job completion bonus, centralized and hooked into all 3 completion paths

**Files:**
- Modify: `SERVER/src/services/reputation/reputation.service.ts` (add `awardJobCompletion`)
- Modify: `SERVER/src/services/booking/booking-status.service.ts:23-117` (`updateBookingStatus`)
- Modify: `SERVER/src/services/booking/booking-auto-complete.service.ts` (`completeFinishedBookings`)
- Modify: `SERVER/src/services/booking/booking-dispute.service.ts:117-193` (`resolveDispute`)
- Test: `SERVER/src/services/reputation/reputation.service.test.ts` (new, for `awardJobCompletion`); extend `booking-auto-complete.service.test.ts`

**Interfaces:**
- Consumes: `ReputationConfigKey.JOB_COMPLETION_BONUS` (Task 1); `reputationService.recoverPoints`.
- Produces: `reputationService.awardJobCompletion(workerId: string): Promise<void>` — reused by Task 12 (late completion) in the same auto-complete loop, and standalone by Task 13 (no hook needed there, separate path).

- [ ] **Step 1: Write the failing test for the new service method**

```ts
// SERVER/src/services/reputation/reputation.service.test.ts
import { ReputationService } from "./reputation.service";
import { reputationConfigService } from "./reputation-config.service";
import { userRepository } from "../../repositories/auth/user.repository";
import { reputationHistoryRepository } from "../../repositories/reputation/reputation-history.repository";
import { ReputationHistoryReason } from "../../types/reputation/reputation-history.types";

jest.mock("./reputation-config.service", () => ({
  reputationConfigService: { getValue: jest.fn(), getActiveValue: jest.fn() },
}));
jest.mock("../../repositories/auth/user.repository", () => ({
  userRepository: { adjustReputationScore: jest.fn() },
}));
jest.mock("../../repositories/reputation/reputation-history.repository", () => ({
  reputationHistoryRepository: { create: jest.fn() },
}));
jest.mock("../notification", () => ({
  notificationEventService: { reputationWarning: jest.fn() },
}));

const config = reputationConfigService as jest.Mocked<
  typeof reputationConfigService
>;
const userRepo = userRepository as jest.Mocked<typeof userRepository>;
const historyRepo = reputationHistoryRepository as jest.Mocked<
  typeof reputationHistoryRepository
>;

const service = new ReputationService();

beforeEach(() => jest.clearAllMocks());

it("awards the configured job-completion bonus with defaultScore 0", async () => {
  config.getActiveValue.mockResolvedValue(5);
  userRepo.adjustReputationScore.mockResolvedValue({
    previousScore: 10,
    newScore: 15,
  });

  await service.awardJobCompletion("worker1");

  expect(userRepo.adjustReputationScore).toHaveBeenCalledWith(
    "worker1",
    5,
    0
  );
  expect(historyRepo.create).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: "worker1",
      reason: ReputationHistoryReason.JOB_COMPLETED,
    })
  );
});

it("skips when the bonus is disabled", async () => {
  config.getActiveValue.mockResolvedValue(null);

  await service.awardJobCompletion("worker1");

  expect(userRepo.adjustReputationScore).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd SERVER && npx jest reputation.service.test.ts`
Expected: FAIL — `awardJobCompletion` does not exist.

- [ ] **Step 3: Implement `awardJobCompletion`**

Edit `SERVER/src/services/reputation/reputation.service.ts`, add:

```ts
  async awardJobCompletion(workerId: string): Promise<void> {
    const points = await reputationConfigService.getActiveValue(
      ReputationConfigKey.JOB_COMPLETION_BONUS
    );
    if (points === null) return;
    await this.recoverPoints(
      workerId,
      points,
      ReputationHistoryReason.JOB_COMPLETED,
      0
    );
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd SERVER && npx jest reputation.service.test.ts`
Expected: PASS

- [ ] **Step 5: Hook into `booking-status.service.ts` (client accepts completion)**

Edit `SERVER/src/services/booking/booking-status.service.ts` — `reputationService`, `reputationConfigService`, `ReputationConfigKey`, and `ReputationHistoryReason` are already imported at the top of this file (used by the existing cancel-flow deductions), so no new imports are needed.

In `updateBookingStatus`, after `notificationEventService`/`sendQuickBookingStatusEmail` calls and before `return updatedBooking`:

```ts
    void notificationEventService
      .bookingStatusUpdated(updatedBooking, status, userId)
      .catch((error) =>
        logger.error("Booking status notification failed:", error)
      );

    void sendQuickBookingStatusEmail(updatedBooking, status).catch((error) =>
      logger.error("Quick booking status email failed:", error)
    );

    if (status === BookingStatus.COMPLETED) {
      const workerIdRaw = updatedBooking.worker_id as unknown as {
        _id?: unknown;
      };
      const workerId = String(workerIdRaw?._id ?? updatedBooking.worker_id);
      void reputationService
        .awardJobCompletion(workerId)
        .catch((err) =>
          logger.error("Reputation bonus after job completion failed:", err)
        );
    }

    return updatedBooking;
```

- [ ] **Step 6: Hook into `booking-auto-complete.service.ts` (both branches)**

Edit `SERVER/src/services/booking/booking-auto-complete.service.ts`, add import:

```ts
import { reputationService } from "../reputation/reputation.service";
import { reputationConfigService } from "../reputation/reputation-config.service";
import { ReputationConfigKey } from "../../types/reputation/reputation-config.types";
import { ReputationHistoryReason } from "../../types/reputation/reputation-history.types";
import { BOOKING_AUTO_COMPLETE_STARTED_STATUSES } from "../../constants/booking";
```

Replace the `for` loop body in `completeFinishedBookings`:

```ts
    for (const booking of candidates) {
      const wasStarted = BOOKING_AUTO_COMPLETE_STARTED_STATUSES.includes(
        booking.status as BookingStatus
      );

      const completed = await bookingRepository.autoCompleteBooking(
        booking._id.toString()
      );

      if (!completed) continue;

      completedCount += 1;

      const workerIdRaw = completed.worker_id as unknown as {
        _id?: unknown;
      };
      const workerId = String(workerIdRaw?._id ?? completed.worker_id);

      void reputationService
        .awardJobCompletion(workerId)
        .catch((error) =>
          logger.error(
            "Reputation bonus after auto-complete failed:",
            error
          )
        );

      // Only the "started" branch (worker had already begun the job) implies
      // they simply forgot to close it out — the "unstarted" 3-day branch has
      // no evidence the appointment happened at all, so it stays unpenalized.
      if (wasStarted) {
        void reputationConfigService
          .getActiveValue(ReputationConfigKey.LATE_COMPLETION_PENALTY)
          .then((points) => {
            if (points === null) return;
            return reputationService.deductPoints(
              workerId,
              points,
              ReputationHistoryReason.LATE_COMPLETION,
              0
            );
          })
          .catch((error) =>
            logger.error(
              "Reputation deduction after late completion failed:",
              error
            )
          );
      }

      void notificationEventService
        .bookingStatusUpdated(completed, BookingStatus.COMPLETED, null)
        .catch((error) =>
          logger.error("Booking auto-complete notification failed:", error)
        );

      void sendQuickBookingStatusEmail(
        completed,
        BookingStatus.COMPLETED
      ).catch((error) =>
        logger.error("Booking auto-complete email failed:", error)
      );
    }
```

- [ ] **Step 7: Hook into `booking-dispute.service.ts` (favor-worker resolution)**

Edit `SERVER/src/services/booking/booking-dispute.service.ts`, add import:

```ts
import { reputationService } from "../reputation/reputation.service";
import { reputationConfigService } from "../reputation/reputation-config.service";
import { ReputationConfigKey } from "../../types/reputation/reputation-config.types";
import { ReputationHistoryReason } from "../../types/reputation/reputation-history.types";
```

In `resolveDispute`, after `bookingRepository.updateStatus` succeeds and before the existing `notificationEventService.disputeResolved` call:

```ts
    const updatedBooking = await bookingRepository.updateStatus(
      bookingId,
      finalStatus,
      updateData
    );

    if (!updatedBooking) {
      throw new AppError(
        BOOKING_MESSAGES.BOOKING_NOT_FOUND,
        HTTP_STATUS.NOT_FOUND,
        ErrorCode.BOOKING_NOT_FOUND
      );
    }

    const workerIdRaw = updatedBooking.worker_id as unknown as {
      _id?: unknown;
    };
    const workerId = String(workerIdRaw?._id ?? updatedBooking.worker_id);

    if (finalStatus === BookingStatus.COMPLETED) {
      void reputationService
        .awardJobCompletion(workerId)
        .catch((error) =>
          logger.error(
            "Reputation bonus after dispute-resolved completion failed:",
            error
          )
        );
    }

    if (
      resolution === DisputeResolution.FAVOR_CLIENT &&
      booking.dispute?.reason === DisputeReason.WORKER_NO_SHOW
    ) {
      void reputationConfigService
        .getActiveValue(ReputationConfigKey.CANCEL_NOSHOW_PENALTY)
        .then((points) => {
          if (points === null) return;
          return reputationService.deductPoints(
            workerId,
            points,
            ReputationHistoryReason.WORKER_NO_SHOW,
            0
          );
        })
        .catch((error) =>
          logger.error(
            "Reputation deduction after worker no-show failed:",
            error
          )
        );
    }

    void notificationEventService
      .disputeResolved(updatedBooking, adminUserId, resolution)
      .catch((error) =>
        logger.error("Dispute resolution notification failed:", error)
      );

    return updatedBooking;
```

(Note: this single step also implements Task 12 — no-show penalty — since both hooks land in the same `resolveDispute` edit. Skip re-editing this file in Task 12.)

- [ ] **Step 8: Run tests**

Run: `cd SERVER && npx jest reputation.service booking-auto-complete booking-status booking-dispute`
Expected: PASS — extend `booking-auto-complete.service.test.ts` with a case asserting `reputationService.awardJobCompletion` is called for every completed booking and `deductPoints` with `LATE_COMPLETION` only for bookings whose pre-update status was in `BOOKING_AUTO_COMPLETE_STARTED_STATUSES`, following that file's existing `jest.mock` factory style (add `reputationService`/`reputationConfigService` mocks alongside the existing ones).

- [ ] **Step 9: Full typecheck**

Run: `cd SERVER && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add SERVER/src/services/reputation/reputation.service.ts SERVER/src/services/reputation/reputation.service.test.ts SERVER/src/services/booking/booking-status.service.ts SERVER/src/services/booking/booking-auto-complete.service.ts SERVER/src/services/booking/booking-auto-complete.service.test.ts SERVER/src/services/booking/booking-dispute.service.ts
git commit -m "feat(reputation): award job-completion bonus and penalize late close-out / no-show"
```

---

### Task 12: (No-show penalty — implemented as part of Task 11, Step 7)

This task is folded into Task 11 because both the job-completion award and the no-show penalty are triggered from the exact same `resolveDispute` code path and would otherwise require re-editing the same lines twice. No separate work here — verify `ReputationHistoryReason.WORKER_NO_SHOW` deduction is covered by a `booking-dispute.service.test.ts` case:

**Files:**
- Test: `SERVER/src/services/booking/booking-dispute.service.test.ts` (check if it exists first: `find SERVER/src -iname "booking-dispute.service.test.ts"`; create following `booking-auto-complete.service.test.ts`'s mocking style if absent)

- [ ] **Step 1: Write the test**

```ts
it("deducts the no-show penalty when a WORKER_NO_SHOW dispute resolves FAVOR_CLIENT", async () => {
  // Arrange: booking fetched by getBookingOrThrow has status DISPUTED and
  // dispute.reason = DisputeReason.WORKER_NO_SHOW; roleInfo.isAdmin = true.
  await service.resolveDispute(
    "booking1",
    "admin1",
    DisputeResolution.FAVOR_CLIENT,
    "confirmed no-show",
    { isAdmin: true } as never
  );

  expect(reputationService.deductPoints).toHaveBeenCalledWith(
    "worker1",
    30,
    ReputationHistoryReason.WORKER_NO_SHOW,
    0
  );
  expect(reputationService.awardJobCompletion).not.toHaveBeenCalled();
});

it("does not deduct the no-show penalty for other dispute reasons", async () => {
  // booking.dispute.reason = DisputeReason.POOR_QUALITY
  await service.resolveDispute(
    "booking1",
    "admin1",
    DisputeResolution.FAVOR_CLIENT,
    "refunded",
    { isAdmin: true } as never
  );

  expect(reputationService.deductPoints).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run and confirm it already passes**

Run: `cd SERVER && npx jest booking-dispute.service.test.ts`
Expected: PASS (implementation already landed in Task 11).

- [ ] **Step 3: Commit**

```bash
git add SERVER/src/services/booking/booking-dispute.service.test.ts
git commit -m "test(reputation): cover worker no-show penalty on dispute resolution"
```

---

### Task 13: Tiered worker-cancellation penalties (replaces `worker_cancel_deduction`)

**Files:**
- Modify: `SERVER/src/services/booking/booking-status.service.ts:187-205` (`cancelBooking`)
- Test: `SERVER/src/services/booking/booking-status.cancel-tiers.test.ts` (new, or extend an existing `booking-status.service.test.ts` if found)

**Interfaces:**
- Consumes: `ReputationConfigKey.CANCEL_MEDIUM_PENALTY`, `.CANCEL_SEVERE_PENALTY` (Task 1).
- Produces: nothing consumed elsewhere (leaf hook).

- [ ] **Step 1: Write the failing test**

```ts
// SERVER/src/services/booking/booking-status.cancel-tiers.test.ts
import { BookingStatusService } from "./booking-status.service";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { reputationService } from "../reputation/reputation.service";
import { reputationConfigService } from "../reputation/reputation-config.service";
import { CancellationReason, CancelledBy } from "../../constants/booking";
import { ReputationHistoryReason } from "../../types/reputation/reputation-history.types";
import { ReputationConfigKey } from "../../types/reputation/reputation-config.types";

jest.mock("../../repositories/booking/booking.repository");
jest.mock("../notification", () => ({
  notificationEventService: {
    bookingStatusUpdated: jest.fn().mockResolvedValue(undefined),
    bookingCancelled: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("./booking-email", () => ({
  sendQuickBookingStatusEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../reputation/reputation.service", () => ({
  reputationService: { deductPoints: jest.fn() },
}));
jest.mock("../reputation/reputation-config.service", () => ({
  reputationConfigService: { getActiveValue: jest.fn() },
}));

const repo = bookingRepository as jest.Mocked<typeof bookingRepository>;
const repService = reputationService as jest.Mocked<typeof reputationService>;
const repConfig = reputationConfigService as jest.Mocked<
  typeof reputationConfigService
>;
const service = new BookingStatusService();

const bookingAt = (startOffsetMs: number) => ({
  status: "confirmed",
  client_id: { toString: () => "client1" },
  worker_id: { toString: () => "worker1" },
  schedule: { start_time: new Date(Date.now() + startOffsetMs) },
});

beforeEach(() => {
  jest.clearAllMocks();
  repConfig.getActiveValue.mockImplementation(async (key) => {
    if (key === ReputationConfigKey.CANCEL_MEDIUM_PENALTY) return 10;
    if (key === ReputationConfigKey.CANCEL_SEVERE_PENALTY) return 20;
    return null;
  });
});

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

it("applies the medium penalty between 30 minutes and 2 hours before start", async () => {
  const booking = bookingAt(HOUR); // 1 hour out
  jest
    .spyOn(service as never, "getBookingOrThrow")
    .mockResolvedValue(booking as never);
  repo.updateStatus.mockResolvedValue(booking as never);

  await service.cancelBooking(
    "b1",
    "worker1",
    CancellationReason.WORKER_UNAVAILABLE,
    "",
    { isAdmin: false } as never
  );
  await new Promise((r) => setTimeout(r, 0));

  expect(repService.deductPoints).toHaveBeenCalledWith(
    "worker1",
    10,
    ReputationHistoryReason.WORKER_CANCEL_MEDIUM,
    0
  );
});

it("applies the severe penalty under 30 minutes before start", async () => {
  const booking = bookingAt(10 * MINUTE);
  jest
    .spyOn(service as never, "getBookingOrThrow")
    .mockResolvedValue(booking as never);
  repo.updateStatus.mockResolvedValue(booking as never);

  await service.cancelBooking(
    "b1",
    "worker1",
    CancellationReason.WORKER_UNAVAILABLE,
    "",
    { isAdmin: false } as never
  );
  await new Promise((r) => setTimeout(r, 0));

  expect(repService.deductPoints).toHaveBeenCalledWith(
    "worker1",
    20,
    ReputationHistoryReason.WORKER_CANCEL_SEVERE,
    0
  );
});

it("applies no penalty when cancelling 2+ hours before start", async () => {
  const booking = bookingAt(3 * HOUR);
  jest
    .spyOn(service as never, "getBookingOrThrow")
    .mockResolvedValue(booking as never);
  repo.updateStatus.mockResolvedValue(booking as never);

  await service.cancelBooking(
    "b1",
    "worker1",
    CancellationReason.WORKER_UNAVAILABLE,
    "",
    { isAdmin: false } as never
  );
  await new Promise((r) => setTimeout(r, 0));

  expect(repService.deductPoints).not.toHaveBeenCalled();
});
```

Adjust the `getBookingOrThrow`/`isBookingWorker` mocking to match whatever `BookingBaseService` actually exposes — read `SERVER/src/services/booking/booking-helpers.ts` first if this spy approach doesn't line up with its real shape, and mock at the same seam `booking-status.start-gate.test.ts` already uses for this class.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd SERVER && npx jest booking-status.cancel-tiers.test.ts`
Expected: FAIL — currently deducts a flat `worker_cancel_deduction` regardless of timing.

- [ ] **Step 3: Implement**

Edit `SERVER/src/services/booking/booking-status.service.ts:187-205`, replacing the `WORKER_CANCEL_DEDUCTION` block:

```ts
    if (cancelledBy === CancelledBy.WORKER) {
      const workerIdRaw = updatedBooking.worker_id as unknown as {
        _id?: unknown;
      };
      const workerId = String(workerIdRaw?._id ?? updatedBooking.worker_id);
      const minutesUntilStart =
        (updatedBooking.schedule.start_time.getTime() - Date.now()) /
        (60 * 1000);

      let penaltyKey: ReputationConfigKey | null = null;
      let reason: ReputationHistoryReason | null = null;
      if (minutesUntilStart < 30) {
        penaltyKey = ReputationConfigKey.CANCEL_SEVERE_PENALTY;
        reason = ReputationHistoryReason.WORKER_CANCEL_SEVERE;
      } else if (minutesUntilStart < 120) {
        penaltyKey = ReputationConfigKey.CANCEL_MEDIUM_PENALTY;
        reason = ReputationHistoryReason.WORKER_CANCEL_MEDIUM;
      }

      if (penaltyKey && reason) {
        const finalReason = reason;
        void reputationConfigService
          .getActiveValue(penaltyKey)
          .then((points) => {
            if (points === null) return;
            return reputationService.deductPoints(
              workerId,
              points,
              finalReason,
              0
            );
          })
          .catch((err) =>
            logger.error("Reputation deduction after worker cancel failed:", err)
          );
      }
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd SERVER && npx jest booking-status.cancel-tiers.test.ts`
Expected: PASS

- [ ] **Step 5: Run full booking-status test suite for regressions**

Run: `cd SERVER && npx jest booking-status`
Expected: PASS (client late-cancel branch below this block is untouched).

- [ ] **Step 6: Commit**

```bash
git add SERVER/src/services/booking/booking-status.service.ts SERVER/src/services/booking/booking-status.cancel-tiers.test.ts
git commit -m "feat(reputation): replace flat worker-cancel deduction with time-based tiers"
```

---

### Task 14: Report resolution bonuses/penalties

**Files:**
- Modify: `SERVER/src/services/moderation/moderation.service.ts:203-228` (`updateReportStatus`)
- Test: `SERVER/src/services/moderation/moderation.service.test.ts` (check if it exists first; extend or create following the repo's mocking conventions)

**Interfaces:**
- Consumes: `ReputationConfigKey.REPORT_FILED_VALID_BONUS`, `.REPORTED_VALID_PENALTY` (Task 1); `userRepository.getUserRoleInfoById` (existing); `moderationRepository.findReportById` (existing).
- Produces: nothing consumed elsewhere (leaf hook).

- [ ] **Step 1: Write the failing test**

```ts
// SERVER/src/services/moderation/moderation.service.test.ts
import { ModerationService } from "./moderation.service";
import { moderationRepository } from "../../repositories/moderation/moderation.repository";
import { userRepository } from "../../repositories/auth/user.repository";
import { reputationService } from "../reputation/reputation.service";
import { reputationConfigService } from "../reputation/reputation-config.service";
import { ReportStatus, ReportTargetType } from "../../constants/moderation";
import { ReputationHistoryReason } from "../../types/reputation/reputation-history.types";

jest.mock("../../repositories/moderation/moderation.repository");
jest.mock("../../repositories/auth/user.repository", () => ({
  userRepository: { getUserRoleInfoById: jest.fn() },
}));
jest.mock("../reputation/reputation.service", () => ({
  reputationService: { deductPoints: jest.fn(), recoverPoints: jest.fn() },
}));
jest.mock("../reputation/reputation-config.service", () => ({
  reputationConfigService: { getActiveValue: jest.fn() },
}));

const repo = moderationRepository as jest.Mocked<typeof moderationRepository>;
const userRepo = userRepository as jest.Mocked<typeof userRepository>;
const repService = reputationService as jest.Mocked<typeof reputationService>;
const repConfig = reputationConfigService as jest.Mocked<
  typeof reputationConfigService
>;

const service = new ModerationService();

beforeEach(() => {
  jest.clearAllMocks();
  repConfig.getActiveValue.mockImplementation(async (key) => {
    if (key === "report_filed_valid_bonus" as never) return 10;
    if (key === "reported_valid_penalty" as never) return 10;
    return null;
  });
});

it("awards the reporter and penalizes the target when both are workers", async () => {
  repo.findReportById.mockResolvedValue({
    status: ReportStatus.OPEN,
    reporter_id: "reporter1",
    target_user_id: "target1",
    target_type: ReportTargetType.WORKER,
  } as never);
  repo.updateReportStatus.mockResolvedValue({
    _id: "r1",
    target_type: ReportTargetType.WORKER,
  } as never);
  userRepo.getUserRoleInfoById.mockImplementation(async (id) => ({
    lastActiveRole: null,
    roles: ["worker"] as never,
    status: null,
    isWorker: true,
    isClient: false,
    isAdmin: false,
  }));

  await service.updateReportStatus({
    reportId: "r1",
    status: ReportStatus.RESOLVED,
    adminId: "admin1",
  });
  await new Promise((r) => setTimeout(r, 0));

  expect(repService.recoverPoints).toHaveBeenCalledWith(
    "reporter1",
    10,
    ReputationHistoryReason.REPORT_FILED_VALID,
    0
  );
  expect(repService.deductPoints).toHaveBeenCalledWith(
    "target1",
    10,
    ReputationHistoryReason.REPORTED_VALID,
    0
  );
});

it("does not re-award when the report was already resolved", async () => {
  repo.findReportById.mockResolvedValue({
    status: ReportStatus.RESOLVED,
    reporter_id: "reporter1",
    target_user_id: "target1",
    target_type: ReportTargetType.WORKER,
  } as never);
  repo.updateReportStatus.mockResolvedValue({
    _id: "r1",
    target_type: ReportTargetType.WORKER,
  } as never);

  await service.updateReportStatus({
    reportId: "r1",
    status: ReportStatus.RESOLVED,
    adminId: "admin1",
  });
  await new Promise((r) => setTimeout(r, 0));

  expect(repService.recoverPoints).not.toHaveBeenCalled();
  expect(repService.deductPoints).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd SERVER && npx jest moderation.service.test.ts`
Expected: FAIL — no reputation calls happen yet.

- [ ] **Step 3: Implement**

Edit `SERVER/src/services/moderation/moderation.service.ts`, add imports:

```ts
import { userRepository } from "../../repositories/auth/user.repository";
import { reputationService } from "../reputation/reputation.service";
import { reputationConfigService } from "../reputation/reputation-config.service";
import { ReputationConfigKey } from "../../types/reputation/reputation-config.types";
import { ReputationHistoryReason } from "../../types/reputation/reputation-history.types";
```

Replace `updateReportStatus`:

```ts
  async updateReportStatus(input: {
    reportId: string;
    status: ReportStatus;
    adminId: string;
    adminNote?: string | null;
  }) {
    const existing = await moderationRepository.findReportById(
      input.reportId
    );
    const previousStatus = existing?.status ?? null;

    const report = await moderationRepository.updateReportStatus(input);
    if (!report) throw AppError.notFound(MODERATION_MESSAGES.REPORT_NOT_FOUND);

    if (
      input.status === ReportStatus.RESOLVED &&
      report.target_type === ReportTargetType.WORKER
    ) {
      const notifyAt = new Date(Date.now() + WORKER_REPORT_RESOLUTION_DEFER_MS);
      try {
        await moderationRepository.setPendingResolutionNotify(
          String(report._id),
          notifyAt
        );
      } catch (error) {
        logger.error("Failed to set pending resolution notify", error);
      }
    }

    const justResolved =
      input.status === ReportStatus.RESOLVED &&
      previousStatus !== ReportStatus.RESOLVED &&
      existing !== null;

    if (justResolved) {
      const reporterId = String(existing!.reporter_id);
      const targetUserId = existing!.target_user_id
        ? String(existing!.target_user_id)
        : null;

      void userRepository
        .getUserRoleInfoById(reporterId)
        .then((roleInfo) => {
          if (!roleInfo.isWorker) return;
          return reputationConfigService
            .getActiveValue(ReputationConfigKey.REPORT_FILED_VALID_BONUS)
            .then((points) => {
              if (points === null) return;
              return reputationService.recoverPoints(
                reporterId,
                points,
                ReputationHistoryReason.REPORT_FILED_VALID,
                0
              );
            });
        })
        .catch((error) =>
          logger.error("Reputation bonus for valid report filer failed:", error)
        );

      if (targetUserId) {
        void userRepository
          .getUserRoleInfoById(targetUserId)
          .then((roleInfo) => {
            if (!roleInfo.isWorker) return;
            return reputationConfigService
              .getActiveValue(ReputationConfigKey.REPORTED_VALID_PENALTY)
              .then((points) => {
                if (points === null) return;
                return reputationService.deductPoints(
                  targetUserId,
                  points,
                  ReputationHistoryReason.REPORTED_VALID,
                  0
                );
              });
          })
          .catch((error) =>
            logger.error(
              "Reputation penalty for valid report target failed:",
              error
            )
          );
      }
    }

    return report;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd SERVER && npx jest moderation.service.test.ts`
Expected: PASS

- [ ] **Step 5: Full typecheck**

Run: `cd SERVER && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add SERVER/src/services/moderation/moderation.service.ts SERVER/src/services/moderation/moderation.service.test.ts
git commit -m "feat(reputation): award/penalize workers on valid report resolution"
```

---

### Task 15: Frontend — worker setup form gains 3 new fields (occupation, personality, marital status)

**Files:**
- Modify: `pr1as-client/types/index.ts:217-238` (`WorkerProfilePublic`, `WorkerProfileUpdateInput`)
- Modify: `pr1as-client/app/worker/setup/page.tsx` (state, hydration, payload, render)
- Modify: `pr1as-client/messages/vi.json`, `en.json`, `zh.json`, `ko.json` (`WorkerSetup` namespace)

**Interfaces:**
- Consumes: `WorkerProfileUpdateInput` (existing type, extended here).
- Produces: nothing consumed by later tasks (leaf, UI-only).

- [ ] **Step 1: Extend the shared type**

Edit `pr1as-client/types/index.ts:217-234`:

```ts
export type WorkerProfilePublic = {
  date_of_birth?: string | null
  gender?: WorkerGender
  height_cm?: number | null
  weight_kg?: number | null
  star_sign?: string | null
  occupation?: string | null
  lifestyle?: string | null
  hobbies?: string[]
  quote?: string | null
  introduction?: string | null
  personality?: string | null
  marital_status?: string | null
  gallery_urls?: string[]
  experience?: WorkerExperience
  work_locations?: WorkLocationRef[]
  coords?: {
    latitude: number | null
    longitude: number | null
  }
}
```

- [ ] **Step 2: Add state hooks**

Edit `pr1as-client/app/worker/setup/page.tsx:291-304`:

```ts
  const [starSign, setStarSign] = useState("")
  const [occupation, setOccupation] = useState("")
  const [lifestyle, setLifestyle] = useState("")
  const [quote, setQuote] = useState("")
  const [introduction, setIntroduction] = useState("")
  const [personality, setPersonality] = useState("")
  const [maritalStatus, setMaritalStatus] = useState("")
```

- [ ] **Step 3: Hydrate from the fetched profile**

Edit `pr1as-client/app/worker/setup/page.tsx:422-425`:

```ts
      if (profile?.star_sign) setStarSign(profile.star_sign)
      if (profile?.occupation) setOccupation(profile.occupation)
      if (profile?.lifestyle) setLifestyle(profile.lifestyle)
      if (profile?.quote) setQuote(profile.quote)
      if (profile?.introduction) setIntroduction(profile.introduction)
      if (profile?.personality) setPersonality(profile.personality)
      if (profile?.marital_status) setMaritalStatus(profile.marital_status)
```

- [ ] **Step 4: Include in the submit payload**

Edit `pr1as-client/app/worker/setup/page.tsx:584-592` (`buildProfilePayload`):

```ts
    const payload: WorkerProfileUpdateInput = {
      gender,
      hobbies,
      gallery_urls: galleryUrls,
      work_locations: workLocations,
      lifestyle: lifestyle.trim() || undefined,
      quote: quote.trim() || undefined,
      introduction: introduction.trim() || undefined,
      occupation: occupation.trim() || undefined,
      personality: personality.trim() || undefined,
      marital_status: maritalStatus.trim() || undefined,
    }
```

- [ ] **Step 5: Render the 3 new inputs in the Identity card**

Edit `pr1as-client/app/worker/setup/page.tsx:947-976`, inserting after the `quote` field and before the closing `</CardContent>`:

```tsx
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("fields.quote")}</Label>
            <Input
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder={t("placeholders.quote")}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {t("fields.occupation")}
            </Label>
            <Input
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder={t("placeholders.occupation")}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {t("fields.personality")}
            </Label>
            <Input
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              placeholder={t("placeholders.personality")}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {t("fields.maritalStatus")}
            </Label>
            <Input
              value={maritalStatus}
              onChange={(e) => setMaritalStatus(e.target.value)}
              placeholder={t("placeholders.maritalStatus")}
              className="h-11 rounded-xl"
            />
          </div>
        </CardContent>
      </Card>
```

- [ ] **Step 6: Add i18n keys to all 4 locales**

Edit `pr1as-client/messages/vi.json` (`WorkerSetup.fields` and `.placeholders`, near `lifestyle`/`quote`):

```json
    "fields": {
      "dateOfBirth": "Ngày sinh",
      "gender": "Giới tính",
      "experience": "Kinh nghiệm",
      "height": "Chiều cao",
      "weight": "Cân nặng",
      "starSign": "Cung hoàng đạo",
      "occupation": "Nghề nghiệp",
      "lifestyle": "Lối sống",
      "quote": "Câu nói yêu thích",
      "personality": "Tính cách",
      "maritalStatus": "Tình trạng hôn nhân"
    },
    "placeholders": {
      "dateOfBirth": "Chọn ngày sinh",
      "experience": "Chọn kinh nghiệm",
      "starSign": "Chọn cung hoàng đạo",
      "occupation": "VD: Nhân viên văn phòng, tự do...",
      "lifestyle": "VD: Năng động, thích khám phá...",
      "quote": "Một câu nói ấn tượng về bạn...",
      "personality": "VD: Vui vẻ, hòa đồng, chu đáo...",
      "maritalStatus": "VD: Độc thân, đã kết hôn...",
      "hobby": "Thêm sở thích...",
      "introduction": "Viết vài dòng giới thiệu bản thân, điểm mạnh và phong cách làm việc của bạn..."
    },
```

Edit `pr1as-client/messages/en.json` (matching `WorkerSetup.fields`/`.placeholders`):

```json
      "starSign": "Star sign",
      "occupation": "Occupation",
      "lifestyle": "Lifestyle",
      "quote": "Favorite quote",
      "personality": "Personality",
      "maritalStatus": "Marital status"
```

```json
      "occupation": "E.g. Office worker, freelancer...",
      "lifestyle": "E.g. Active, enjoys exploring...",
      "quote": "A memorable quote about you...",
      "personality": "E.g. Cheerful, sociable, caring...",
      "maritalStatus": "E.g. Single, married..."
```

Edit `pr1as-client/messages/zh.json`:

```json
      "starSign": "星座",
      "occupation": "职业",
      "lifestyle": "生活方式",
      "quote": "喜爱的格言",
      "personality": "性格",
      "maritalStatus": "婚姻状况"
```

```json
      "occupation": "例如：上班族、自由职业...",
      "lifestyle": "例如：活跃、喜欢探索...",
      "quote": "一句能代表你的话...",
      "personality": "例如：开朗、善于交际、体贴...",
      "maritalStatus": "例如：单身、已婚..."
```

Edit `pr1as-client/messages/ko.json`:

```json
      "starSign": "별자리",
      "occupation": "직업",
      "lifestyle": "라이프스타일",
      "quote": "좋아하는 문구",
      "personality": "성격",
      "maritalStatus": "결혼 상태"
```

```json
      "occupation": "예: 회사원, 프리랜서...",
      "lifestyle": "예: 활동적이며 탐험을 즐김...",
      "quote": "나를 보여주는 인상적인 문구...",
      "personality": "예: 밝고 사교적이며 배려심 많음...",
      "maritalStatus": "예: 미혼, 기혼..."
```

- [ ] **Step 7: Typecheck and lint**

Run: `cd pr1as-client && npm run typecheck && npm run lint`
Expected: no errors.

- [ ] **Step 8: Manual verification**

Run: `cd pr1as-client && npm run dev`, open `/worker/setup`, confirm the 3 new fields render in the "Identity"/"Định danh cá nhân" card, accept input, persist after save+reload, and render correctly with `NEXT_LOCALE` set to each of `vi`/`en`/`zh`/`ko`.

- [ ] **Step 9: Commit**

```bash
git add pr1as-client/types/index.ts pr1as-client/app/worker/setup/page.tsx pr1as-client/messages/vi.json pr1as-client/messages/en.json pr1as-client/messages/zh.json pr1as-client/messages/ko.json
git commit -m "feat(worker): add occupation, personality, marital status to setup form"
```

---

### Task 16: Migration script for existing workers

**Files:**
- Create: `SERVER/src/scripts/migrate-worker-reputation.ts`
- Create: `SERVER/src/services/reputation/worker-reputation-migration.service.ts`
- Modify: `SERVER/package.json` (add `migrate:worker-reputation` script)
- Test: `SERVER/src/services/reputation/worker-reputation-migration.service.test.ts`

**Interfaces:**
- Consumes: `computeProfileCompletenessScore` (Task 9); `ReputationConfigKey.REVIEW_RECEIVED_BONUS`, `.FIVE_STAR_REVIEW_BONUS`, `.JOB_COMPLETION_BONUS`, `.LOW_REVIEW_DEDUCTION`, `.LOW_REVIEW_THRESHOLD` (Task 1); `userRepository.setReputationProfileComponent` (Task 9).
- Produces: `workerReputationMigrationService.runManual({ apply: boolean }): Promise<{ scanned: number; updated: number }>` — standalone script entry point, nothing else depends on it.

- [ ] **Step 1: Write the failing test**

```ts
// SERVER/src/services/reputation/worker-reputation-migration.service.test.ts
import { WorkerReputationMigrationService } from "./worker-reputation-migration.service";
import { userRepository } from "../../repositories/auth/user.repository";
import { reviewRepository } from "../../repositories/review/review.repository";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { reputationConfigService } from "./reputation-config.service";
import { gender, UserRole } from "../../types/auth/user.types";

jest.mock("../../repositories/auth/user.repository", () => ({
  userRepository: {
    findAllWorkersForMigration: jest.fn(),
    setReputationScoreAndComponent: jest.fn(),
  },
}));
jest.mock("../../repositories/review/review.repository", () => ({
  reviewRepository: { countAndAverageForWorker: jest.fn() },
}));
jest.mock("../../repositories/booking/booking.repository", () => ({
  bookingRepository: { countCompletedForWorker: jest.fn() },
}));
jest.mock("./reputation-config.service", () => ({
  reputationConfigService: { getValue: jest.fn() },
}));

const userRepo = userRepository as jest.Mocked<typeof userRepository>;
const reviewRepo = reviewRepository as jest.Mocked<typeof reviewRepository>;
const bookingRepo = bookingRepository as jest.Mocked<typeof bookingRepository>;
const config = reputationConfigService as jest.Mocked<
  typeof reputationConfigService
>;

const service = new WorkerReputationMigrationService();

beforeEach(() => {
  jest.clearAllMocks();
  config.getValue.mockImplementation(async (key) => {
    const values: Record<string, number> = {
      profile_photos_bonus: 10,
      min_profile_photos_threshold: 5,
      profile_info_field_bonus: 5,
      review_received_bonus: 5,
      five_star_review_bonus: 5,
      job_completion_bonus: 5,
      low_review_threshold: 2,
    };
    return values[key as unknown as string];
  });
});

it("computes a clamped score from profile + reviews + completed jobs", async () => {
  userRepo.findAllWorkersForMigration.mockResolvedValue([
    {
      _id: { toString: () => "w1" },
      roles: [UserRole.WORKER],
      worker_profile: {
        gender: gender.OTHER,
        introduction: "hi",
        hobbies: [],
        gallery_urls: ["a", "b", "c", "d", "e"], // +10
      },
    } as never,
  ]);
  reviewRepo.countAndAverageForWorker.mockResolvedValue({
    total: 4,
    fiveStarCount: 2,
    lowRatingCount: 1,
  });
  bookingRepo.countCompletedForWorker.mockResolvedValue(3);

  const result = await service.runManual({ apply: true });

  // profile: 10 (photos) + 5 (introduction) = 15
  // reviews: 4*5 + 2*5 - 1*10 = 20 + 10 - 10 = 20
  // jobs: 3*5 = 15
  // total = 50, clamped [0,100]
  expect(userRepo.setReputationScoreAndComponent).toHaveBeenCalledWith(
    "w1",
    50,
    15
  );
  expect(result).toEqual({ scanned: 1, updated: 1 });
});

it("does not write when apply=false (dry run)", async () => {
  userRepo.findAllWorkersForMigration.mockResolvedValue([
    {
      _id: { toString: () => "w1" },
      roles: [UserRole.WORKER],
      worker_profile: null,
    } as never,
  ]);
  reviewRepo.countAndAverageForWorker.mockResolvedValue({
    total: 0,
    fiveStarCount: 0,
    lowRatingCount: 0,
  });
  bookingRepo.countCompletedForWorker.mockResolvedValue(0);

  const result = await service.runManual({ apply: false });

  expect(userRepo.setReputationScoreAndComponent).not.toHaveBeenCalled();
  expect(result).toEqual({ scanned: 1, updated: 0 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd SERVER && npx jest worker-reputation-migration.service.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Add the two repository methods it depends on**

Edit `SERVER/src/repositories/auth/user.repository.ts`, add:

```ts
  async findAllWorkersForMigration(): Promise<IUserDocument[]> {
    return User.find({ roles: UserRole.WORKER });
  }

  async setReputationScoreAndComponent(
    id: string,
    score: number,
    profileComponent: number
  ): Promise<void> {
    await User.findByIdAndUpdate(id, {
      "meta_data.reputation_score": Math.max(0, Math.min(100, score)),
      "meta_data.reputation_profile_component": profileComponent,
    });
  }
```

Edit `SERVER/src/repositories/review/review.repository.ts`, add (check the file's existing aggregation style first and match it):

```ts
  async countAndAverageForWorker(workerId: string): Promise<{
    total: number;
    fiveStarCount: number;
    lowRatingCount: number;
  }> {
    const [row] = await Review.aggregate([
      { $match: { worker_id: new Types.ObjectId(workerId) } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          fiveStarCount: {
            $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] },
          },
          lowRatingCount: {
            $sum: { $cond: [{ $lte: ["$rating", 2] }, 1, 0] },
          },
        },
      },
    ]);
    return row ?? { total: 0, fiveStarCount: 0, lowRatingCount: 0 };
  }
```

(The `lowRatingCount` threshold of `2` here mirrors the current `low_review_threshold` default; this is a one-time backfill script, not a live per-review check, so it is acceptable to read the threshold as a constant `2` rather than re-fetching config per row — document this as a code comment.)

Edit `SERVER/src/repositories/booking/booking.repository.ts`, add:

```ts
  async countCompletedForWorker(workerId: string): Promise<number> {
    return Booking.countDocuments({
      worker_id: new Types.ObjectId(workerId),
      status: BookingStatus.COMPLETED,
    });
  }
```

- [ ] **Step 4: Implement the migration service**

Create `SERVER/src/services/reputation/worker-reputation-migration.service.ts`:

```ts
import { userRepository } from "../../repositories/auth/user.repository";
import { reviewRepository } from "../../repositories/review/review.repository";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { reputationConfigService } from "./reputation-config.service";
import { ReputationConfigKey } from "../../types/reputation/reputation-config.types";
import { computeProfileCompletenessScore } from "./worker-profile-completeness";
import { logger } from "../../utils/logger";

export interface WorkerMigrationResult {
  scanned: number;
  updated: number;
}

export class WorkerReputationMigrationService {
  async runManual(options: { apply: boolean }): Promise<WorkerMigrationResult> {
    const [
      photoBonus,
      minPhotos,
      perFieldBonus,
      reviewReceivedBonus,
      fiveStarBonus,
      jobCompletionBonus,
      lowReviewThreshold,
    ] = await Promise.all([
      reputationConfigService.getValue(ReputationConfigKey.PROFILE_PHOTOS_BONUS),
      reputationConfigService.getValue(
        ReputationConfigKey.MIN_PROFILE_PHOTOS_THRESHOLD
      ),
      reputationConfigService.getValue(
        ReputationConfigKey.PROFILE_INFO_FIELD_BONUS
      ),
      reputationConfigService.getValue(ReputationConfigKey.REVIEW_RECEIVED_BONUS),
      reputationConfigService.getValue(ReputationConfigKey.FIVE_STAR_REVIEW_BONUS),
      reputationConfigService.getValue(ReputationConfigKey.JOB_COMPLETION_BONUS),
      reputationConfigService.getValue(ReputationConfigKey.LOW_REVIEW_THRESHOLD),
    ]);
    void lowReviewThreshold; // read for parity with live config; countAndAverageForWorker uses the fixed <=2 cutoff, see repository comment

    const workers = await userRepository.findAllWorkersForMigration();
    let updated = 0;

    for (const worker of workers) {
      const workerId = worker._id.toString();

      const profileComponent = computeProfileCompletenessScore(
        worker.worker_profile,
        { photoBonus, minPhotos, perFieldBonus }
      );

      const [reviewStats, completedJobs] = await Promise.all([
        reviewRepository.countAndAverageForWorker(workerId),
        bookingRepository.countCompletedForWorker(workerId),
      ]);

      const reviewComponent =
        reviewStats.total * reviewReceivedBonus +
        reviewStats.fiveStarCount * fiveStarBonus -
        reviewStats.lowRatingCount * 10; // matches LOW_REVIEW_DEDUCTION new default

      const jobComponent = completedJobs * jobCompletionBonus;

      const totalScore = Math.max(
        0,
        Math.min(100, profileComponent + reviewComponent + jobComponent)
      );

      if (options.apply) {
        await userRepository.setReputationScoreAndComponent(
          workerId,
          totalScore,
          profileComponent
        );
      }

      logger.info("Worker reputation migration row", {
        workerId,
        profileComponent,
        reviewComponent,
        jobComponent,
        totalScore,
        applied: options.apply,
      });

      updated += 1;
    }

    return { scanned: workers.length, updated: options.apply ? updated : 0 };
  }
}

export const workerReputationMigrationService =
  new WorkerReputationMigrationService();
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd SERVER && npx jest worker-reputation-migration.service.test.ts`
Expected: PASS

- [ ] **Step 6: Create the runner script**

Create `SERVER/src/scripts/migrate-worker-reputation.ts` (mirrors `migrate-service-catalog.ts`):

```ts
import "dotenv/config";
import { connectDatabase, closeDatabase } from "../config/database";
import { workerReputationMigrationService } from "../services/reputation/worker-reputation-migration.service";
import { logger } from "../utils/logger";

// One-time backfill for the worker-reputation rework.
//   npm run migrate:worker-reputation            -> dry-run (logs only)
//   npm run migrate:worker-reputation -- --apply -> writes scores
const main = async (): Promise<void> => {
  const apply = process.argv.includes("--apply");
  await connectDatabase();
  try {
    const result = await workerReputationMigrationService.runManual({ apply });
    logger.info("Worker reputation migration finished", result);
  } finally {
    await closeDatabase();
  }
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error("migrate-worker-reputation failed:", error);
    process.exit(1);
  });
```

Edit `SERVER/package.json`, add next to `migrate:service-catalog`:

```json
    "migrate:worker-reputation": "ts-node src/scripts/migrate-worker-reputation.ts",
```

- [ ] **Step 7: Full typecheck**

Run: `cd SERVER && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Dry-run against a real (non-prod) database**

Run: `cd SERVER && npm run migrate:worker-reputation` (no `--apply`), inspect logged rows for a handful of known workers, sanity-check the numbers against expectations before ever running with `--apply`.

- [ ] **Step 9: Commit**

```bash
git add SERVER/src/scripts/migrate-worker-reputation.ts SERVER/src/services/reputation/worker-reputation-migration.service.ts SERVER/src/services/reputation/worker-reputation-migration.service.test.ts SERVER/src/repositories/auth/user.repository.ts SERVER/src/repositories/review/review.repository.ts SERVER/src/repositories/booking/booking.repository.ts SERVER/package.json
git commit -m "feat(reputation): add one-time migration script for existing workers"
```

---

## Suggested execution order

Tasks 1–8 are foundational (config, history reasons, primitive changes, schema, defaults, fallback fixes, recovery exclusion) and should land in order since later tasks depend on them. Tasks 9–14 are independent scoring hooks and can be parallelized across subagents once 1–8 are merged. Task 15 (frontend) only depends on Task 4. Task 16 (migration) depends on Task 9 (`computeProfileCompletenessScore`) and should run last, after all scoring hooks are live, so the backfilled baseline and the new live hooks agree on the same rules.
