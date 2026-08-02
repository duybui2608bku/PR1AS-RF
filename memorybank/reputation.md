# Memory Bank - Reputation System

## Purpose

Reputation is a 0..100 score stored on users, used to protect booking and
worker marketplace quality. The **client** model is unchanged from the
original design: every client starts at 100 and only goes down (negative
booking events deduct points), with a daily job that recovers points over
time and a warning notification when a score crosses a threshold.

The **worker** model was reworked (2026-08-02): a worker's score no longer
defaults to 100. It starts at **0** the moment a user first gains the
`worker` role, and is built up through 12 scoring rules — profile
completeness, reviews received, completed jobs, valid reports, cancellation
tiers, no-shows, late completion. There is no daily recovery for workers.
Almost all of a worker's score movement comes from those 12 rules, but one
pre-existing, unrelated event also deducts a worker's score:
`booking_expiry_deduction` (a pending booking expiring unconfirmed — see
`SERVER/src/services/booking/booking-expiration.service.ts`). This config
key predates the rework and its point value was left unchanged; only its
`defaultScore` parameter was updated to `0` for workers as part of the
original 16-task plan. So in total there are 13 events that can move a
worker's score: the 12 rules below plus `booking_expiry_deduction`. This
closed the original bug report: a worker who had not finished
`/worker/setup` no longer shows a trust-inspiring 100 on their public profile.

Primary source files:

- Config types/defaults: `SERVER/src/types/reputation/reputation-config.types.ts`
- History types: `SERVER/src/types/reputation/reputation-history.types.ts`
- Config model: `SERVER/src/models/reputation-config/reputation-config.model.ts`
- History model: `SERVER/src/models/reputation-history.model.ts`
- Services: `SERVER/src/services/reputation/*`
  - `reputation.service.ts` — `deductPoints`/`recoverPoints`/`bulkDailyRecovery`/
    `awardJobCompletion`/`syncWorkerProfileCompleteness`
  - `worker-profile-completeness.ts` — pure profile-completeness scoring function
  - `worker-reputation-migration.service.ts` — one-time backfill for existing workers
- Repositories: `SERVER/src/repositories/reputation/*`
- User score adjustment/reset: `SERVER/src/repositories/auth/user.repository.ts`
  (`adjustReputationScore`, `updateWorkerProfile`, `createByAdmin`,
  `setReputationScoreAndComponent`, `findReputationRecoveryCandidates`)
- Migration script: `SERVER/src/scripts/migrate-worker-reputation.ts`
- Routes: `SERVER/src/routes/reputation/*`
- Job: `SERVER/src/jobs/reputation-recovery.job.ts`
- Frontend services/hooks:
  - `pr1as-client/services/reputation.service.ts`
  - `pr1as-client/services/reputation-config.service.ts`
  - `pr1as-client/lib/hooks/use-reputation.ts`
  - `pr1as-client/lib/hooks/use-reputation-config.ts`
- Frontend admin UI: `pr1as-client/app/dashboard/reputation-config/page.tsx`

Related design specs (intent at design time — the code below is the final,
post-review source of truth; see "Known Implementation Nuances" for spots
where the shipped code moved past what a spec originally said):

- `docs/superpowers/specs/2026-08-02-worker-reputation-rework-design.md` — the
  12-rule worker model.
- `docs/superpowers/specs/2026-08-02-worker-reputation-followups-design.md` —
  5 follow-up fixes after review (review lockdown, admin UI, `updateUserByAdmin`
  parity, `post.service.ts` fix, this doc).

## Score Storage

Current score is stored on the user:

```ts
User.meta_data.reputation_score
User.meta_data.reputation_profile_component
```

`reputation_score` is a single field shared by both roles — there is no
separate worker/client score. Rules:

- **Client accounts**: default score is 100 (unchanged). A missing score is
  treated as 100 everywhere a client's score is read.
- **Worker accounts**: default score is 0. The score is explicitly set to 0
  (not left to a schema default) the moment a user first gains the `worker`
  role — see "Worker score reset" below. A missing/undefined score for a
  worker is treated as **0**, not 100.
- Score is clamped to 0..100 by `userRepository.adjustReputationScore`.
- User model indexes `meta_data.reputation_score`.
- `meta_data.reputation_profile_component` tracks the profile-completeness
  component of the score in isolation (default 0), so that a later profile
  edit can compute an idempotent delta instead of re-adding the whole bonus
  (see "Profile Completeness" below).

Because both roles share the one field, **do not** write code that assumes
"default 100" universally — every read site must know or check the user's
role first (see "Role-aware fallback pattern" below).

### Worker score reset ("start fresh at 0")

A user's `meta_data.reputation_score` and `meta_data.reputation_profile_component`
are reset to `0` at every point a user first becomes a worker — discarding
any prior client score. This is intentional (accepted tradeoff for the
dual-role field, confirmed with the project owner) and is applied
consistently at all 4 sites that can turn a non-worker into a worker:

| Site | File | Trigger |
| --- | --- | --- |
| `becomeWorker` | `SERVER/src/services/user/user.service.ts` | `POST /api/auth/become-worker`, first time only (`addWorkerRole` only set when `!alreadyWorker`) |
| `updateWorkerProfile` repository call | `SERVER/src/repositories/auth/user.repository.ts` | `options.addWorkerRole` sets `meta_data.reputation_score`/`reputation_profile_component` to 0 as part of the same atomic pipeline update that adds the `worker` role |
| `createByAdmin` | `SERVER/src/repositories/auth/user.repository.ts` | Admin-provisioned account created directly with `roles` including `worker`: `reputation_score: isWorker ? 0 : 100` |
| `updateUserByAdmin` | `SERVER/src/services/user/user.service.ts` | Admin edits an existing (previously non-worker) account to add the `worker` role: `wasWorker` is captured before the update, and if `isWorker && !wasWorker`, `userRepository.setReputationScoreAndComponent(userId, 0, 0)` runs after `updateByAdmin` |

`updateUserByAdmin` additionally re-fetches the user after the reset/update
and calls `reputationService.syncWorkerProfileCompleteness` (fire-and-forget)
so the profile-completeness component reflects the `worker_profile` the
admin just wrote, whether or not this was a first-time worker conversion.

### Role-aware fallback pattern

Every place that reads `meta_data.reputation_score` with a fallback must pick
the fallback based on role, since a missing score means 100 for a client but
0 for a worker. The pattern (`role.includes(WORKER) ? 0 : 100`) is applied at:

- `SERVER/src/utils/user.helper.ts` (`toPublicUser`) — general user-facing payload.
- `SERVER/src/services/comment/comment.service.ts` (`createComment`) — comment-creation reputation gate.
- `SERVER/src/services/post/post.service.ts` (`assertUserCanCreatePost`) — post-creation reputation gate.

Sites where the role is unambiguous at read time skip the role check and use
the fixed default directly: `SERVER/src/services/worker/worker.service.ts`
(`getWorkerById`, `?? 0` — always a worker), and client-only recovery/gate
paths (`?? 100`).

Atomic adjustment:

- `adjustReputationScore(id, delta, defaultScore = 100)` uses a MongoDB
  aggregation update (`$max(0, $min(100, current + delta))`) and returns
  previous/new score from one read-modify-write round trip.
- Callers pass `defaultScore = 0` when adjusting a worker's score (every
  worker-only hook does this explicitly), so a worker with no
  `reputation_score` yet is treated as starting from 0, not 100.

Marketplace effects (unchanged thresholds):

- Booking creation rejects clients with reputation below 30.
- Worker profile booking UI disables booking workers whose displayed
  reputation is below 30. A worker with a complete profile (60 points from
  photos + 10 fields) clears this threshold before ever taking a booking.
- Post/comment creation rejects users with reputation below 30 (role-aware
  fallback, see above).
- Worker profile/header displays reputation score and warning states.

## Config

Collection: `reputation_config`.

Fields:

| Field | Meaning |
| --- | --- |
| `key` | Unique `ReputationConfigKey`. |
| `value` | Numeric value, 0..100 by update validation. |
| `active` | Whether a point-changing rule is active. |
| `description` | Human-readable description. |
| `updated_by` | Admin who last changed it. |
| `updated_at` | Last update timestamp. |

### Config keys and defaults

19 keys total (7 original + 12 added by the rework), matching
`REPUTATION_CONFIG_DEFAULTS` in `SERVER/src/types/reputation/reputation-config.types.ts`:

| Key | Default | Active | Toggleable | Meaning |
| --- | ---: | --- | --- | --- |
| `booking_expiry_deduction` | 10 | yes | yes | Deduct worker when a pending booking expires unconfirmed. Unchanged by the rework. |
| `worker_cancel_deduction` | 10 | yes | yes | **Deprecated.** Replaced by `cancel_medium_penalty`/`cancel_severe_penalty`. Enum/config row kept only so historical `reputation_history` rows referencing it stay valid — no code path writes it anymore. |
| `client_late_cancel_deduction` | 5 | yes | yes | Deduct client for late cancel. Client-only, unchanged. |
| `low_review_deduction` | 10 | yes | yes | Deduct worker for a review at/below the low-review threshold. Default raised from 5 to 10 by the rework. |
| `low_review_threshold` | 2 | yes | no | Rating at/below this counts as "low". |
| `daily_recovery_points` | 5 | yes | yes | Daily recovery amount — **client-only** since the rework (see "Daily Recovery" below). |
| `warning_threshold` | 70 | yes | no | Warning-notification threshold. Unchanged. |
| `profile_photos_bonus` | 10 | yes | yes | Worker points once `gallery_urls.length >= min_profile_photos_threshold`. |
| `min_profile_photos_threshold` | 5 | yes | no | Minimum gallery photo count to earn `profile_photos_bonus`. |
| `profile_info_field_bonus` | 5 | yes | yes | Worker points per filled profile field (up to 10 fields, i.e. up to 50). |
| `review_received_bonus` | 5 | yes | yes | Worker points when any review is received, regardless of rating. |
| `five_star_review_bonus` | 5 | yes | yes | Additional worker points, on top of `review_received_bonus`, when the rating is 5. |
| `job_completion_bonus` | 5 | yes | yes | Worker points when a booking they worked reaches `completed`. |
| `report_filed_valid_bonus` | 10 | yes | yes | Worker points when a report they filed is resolved `resolved`. |
| `reported_valid_penalty` | 10 | yes | yes | Worker points deducted when a report against them is resolved `resolved`. |
| `late_completion_penalty` | 10 | yes | yes | Worker points deducted when a *started* booking is auto-completed for missing an on-time close-out. |
| `cancel_medium_penalty` | 10 | yes | yes | Worker points deducted for cancelling 30 minutes–2 hours before the booking start time. |
| `cancel_severe_penalty` | 20 | yes | yes | Worker points deducted for cancelling less than 30 minutes before the booking start time. |
| `cancel_noshow_penalty` | 30 | yes | yes | Worker points deducted when a `WORKER_NO_SHOW` dispute resolves `FAVOR_CLIENT`. |

Threshold keys are not toggleable: `low_review_threshold`,
`min_profile_photos_threshold`, `warning_threshold`.
`reputationConfigService.updateConfig` rejects attempts to toggle these on/off.

All other 16 keys are toggleable (`TOGGLEABLE_REPUTATION_KEYS`), including
the deprecated `worker_cancel_deduction` (kept toggleable in the type only —
no code path checks it, so toggling it has no effect).

## Config Caching and Seeding

`ReputationConfigService` keeps an in-memory cache:

- TTL: 5 minutes.
- `getValue(key)` returns the numeric value regardless of the `active` flag —
  use this for thresholds (not toggleable).
- `isActive(key)` returns the `active` flag.
- `getActiveValue(key)` returns the value when active, otherwise `null` — use
  this for every point-changing rule so a disabled config correctly
  contributes 0.

When a config is updated: the repository upserts the config row, and the
service invalidates only the updated key from cache.

Default seeding:

- `reputationConfigService.seedDefaults()` is called from app bootstrap.
- It inserts missing config rows with default values (this is how the 12 new
  keys were seeded into existing deployments without a data migration).
- It backfills `active: true` on legacy rows missing the `active` field.

## History

Collection: `reputation_history`.

Fields:

| Field | Meaning |
| --- | --- |
| `user_id` | User whose score changed. |
| `delta` | Actual score change after clamping. |
| `previous_score` | Score before adjustment. |
| `new_score` | Score after adjustment. |
| `reason` | `ReputationHistoryReason`. |
| `created_at` | Timestamp. |

### Reasons

`ReputationHistoryReason` in `SERVER/src/types/reputation/reputation-history.types.ts`
(6 original + 10 added by the rework):

| Reason | Meaning |
| --- | --- |
| `booking_expiry` | Worker did not confirm before deadline. |
| `worker_cancel` | Legacy — historical rows only, no longer written. |
| `client_late_cancel` | Client cancelled too close to start time. |
| `low_review` | Worker received a low review. |
| `daily_recovery` | Client-only recovery job restored points. |
| `manual` | Generic/manual reason. |
| `profile_completeness` | Delta from a profile-completeness recompute (can be positive or negative). |
| `review_received` | Worker received any review. |
| `five_star_review` | Received review's rating was 5. |
| `job_completed` | A worked booking reached `completed`. |
| `report_filed_valid` | A report the worker filed was resolved. |
| `reported_valid` | A report against the worker was resolved. |
| `late_completion` | Started booking auto-completed late. |
| `worker_cancel_medium` | Worker cancelled 30 min–2 h before start. |
| `worker_cancel_severe` | Worker cancelled <30 min before start. |
| `worker_no_show` | `WORKER_NO_SHOW` dispute resolved `FAVOR_CLIENT`. |

History list route:

```text
GET /api/reputation/history?page=&limit=
```

Rules: authenticated user only; returns only the current user's history,
sorted newest first; `limit` uses the validation max from
`VALIDATION_LIMITS.PAGINATION_MAX_LIMIT`.

## The 12 Worker Scoring Rules

Worker-only. Client reputation is untouched by all of the rules below. No new
booking status and no new cron job were added to support any of these — every
rule hooks into an existing mechanism (auto-complete's started/unstarted
split, the existing dispute-resolution flow, the existing cancel flow, the
existing review/report flows).

| # | Event | Points | Config key | History reason | Where it's hooked |
| --- | --- | ---: | --- | --- | --- |
| 1 | Gallery has ≥ `min_profile_photos_threshold` photos | +10 | `profile_photos_bonus` | `profile_completeness` | `worker-profile-completeness.ts`, recomputed by `syncWorkerProfileCompleteness` |
| 2 | Each of 10 profile fields has a value | +5/field, up to +50 | `profile_info_field_bonus` | `profile_completeness` | same as above |
| 3 | Worker receives a new review, any rating | +5 | `review_received_bonus` | `review_received` | `review.service.ts`, `createReview` |
| 4 | Review rating = 5 (on top of #3) | +5 | `five_star_review_bonus` | `five_star_review` | `review.service.ts`, `createReview` |
| 5 | Review rating ≤ `low_review_threshold` | -10 | `low_review_deduction` | `low_review` | `review.service.ts`, `createReview` |
| 6 | Booking reaches `completed` (any of the 3 completion paths, see below) | +5 | `job_completion_bonus` | `job_completed` | `reputationService.awardJobCompletion`, called from `booking-status.service.ts`, `booking-auto-complete.service.ts`, `booking-dispute.service.ts` |
| 7 | A report the worker filed is resolved `resolved` | +10 | `report_filed_valid_bonus` | `report_filed_valid` | `moderation.service.ts`, report status update |
| 8 | A report targeting the worker is resolved `resolved` | -10 | `reported_valid_penalty` | `reported_valid` | `moderation.service.ts`, report status update |
| 9 | A *started* booking (`IN_PROGRESS`/`PENDING_CLIENT_ACCEPTANCE`) is auto-completed past its grace window | -10 | `late_completion_penalty` | `late_completion` | `booking-auto-complete.service.ts`, `completeFinishedBookings()`, only the "started" branch |
| 10 | Worker cancels, 30 min – 2 h before start | -10 | `cancel_medium_penalty` | `worker_cancel_medium` | `booking-status.service.ts`, `cancelBooking()` |
| 11 | Worker cancels, < 30 min before start | -20 | `cancel_severe_penalty` | `worker_cancel_severe` | `booking-status.service.ts`, `cancelBooking()` |
| 12 | `WORKER_NO_SHOW` dispute resolved `FAVOR_CLIENT` | -30 | `cancel_noshow_penalty` | `worker_no_show` | `booking-dispute.service.ts`, `resolveDispute()` |

All 16 non-threshold keys (including the deprecated `worker_cancel_deduction`,
see "Config keys and defaults" above) are independently toggleable — an admin
can disable a rule or change its point value at any time via
`PATCH /api/admin/reputation-config/:key` without a code change.
`reputationService.deductPoints`/`recoverPoints` are always called with
`defaultScore = 0` for worker-only rules, so a worker with no score yet is
treated as starting from 0.

### Profile Completeness (rules #1–#2)

Unlike rules #3–#12, which are one-off events, profile completeness is a
**state** — it can go up or down if the worker edits their profile — computed
by the pure function `computeProfileCompletenessScore` in
`SERVER/src/services/reputation/worker-profile-completeness.ts`. The 10
tracked fields are: `introduction`, `date_of_birth`, `height_cm`, `weight_kg`,
`star_sign`, `occupation`, `lifestyle`, `hobbies`, `personality`,
`marital_status` (the last three were added by the rework alongside the same
free-text pattern as `introduction`/`quote`). `gallery_urls` is scored
separately as the photo bonus, not counted as one of the 10 fields.

`reputationService.syncWorkerProfileCompleteness(user)` recomputes the score
every time a worker's profile changes (`becomeWorker`, `updateWorkerProfile`,
`createUserByAdmin`, `updateUserByAdmin` all call it, fire-and-forget):

1. Recompute `newComponent` from the current `worker_profile`.
2. `delta = newComponent - meta_data.reputation_profile_component`.
3. If `delta !== 0`: call `adjustReputationScore(userId, delta, 0)`, write
   history with reason `profile_completeness`, and persist
   `reputation_profile_component = newComponent` via
   `userRepository.setReputationProfileComponent`.

This makes repeated recomputes idempotent — updating the profile without
actually changing which fields are filled produces `delta === 0` and no-ops.

**Post-review bug fix**: `photoBonus` and `perFieldBonus` are both
toggleable point-changing values (`PROFILE_PHOTOS_BONUS`,
`PROFILE_INFO_FIELD_BONUS` are in `TOGGLEABLE_REPUTATION_KEYS`), so
`syncWorkerProfileCompleteness` fetches them with `getActiveValue` and
treats a `null` (disabled) result as a 0 contribution — mirroring every other
point-changing hook in this codebase. An earlier version of this method used
`getValue` for these two, which meant toggling either config off in the admin
UI had no effect on the computed score; this was found and fixed during
branch review, after the original 16-task implementation.
`MIN_PROFILE_PHOTOS_THRESHOLD` is a pure (non-toggleable) threshold and
correctly stays on `getValue`.

### Job completion bonus (rule #6) — 3 paths, one double-award-prevention fix

`reputationService.awardJobCompletion(workerId)` is called from all 3 places
a booking can transition to `completed`:

1. Normal status-update flow — `booking-status.service.ts`, when
   `status === BookingStatus.COMPLETED`.
2. Auto-complete cron — `booking-auto-complete.service.ts`,
   `completeFinishedBookings()`, unconditionally for every auto-completed
   booking (both the started and unstarted branches award this bonus; only
   the late-completion *penalty*, rule #9, is restricted to the started branch).
3. Dispute resolution — `booking-dispute.service.ts`, `resolveDispute()`,
   when `resolution !== FAVOR_CLIENT` resolves the booking to `COMPLETED`.

**Post-review bug fix**: path 3 could double-award if a booking that was
already `completed` got disputed again and resolved in the worker's favor a
second time. The fix checks the pre-update booking's `completed_at` field —
if it was already truthy before this resolution, the booking already earned
the bonus once and it is not re-awarded. `completed_at` is fetched before the
status-changing update, specifically to use its presence as the "already
completed once" signal. `createDispute` never sets `completed_at`, so this
check is reliable regardless of how many times the booking has been disputed.

### Cancellation tiers (rules #10, #11) and no-show (rule #12)

`booking-status.service.ts`, `cancelBooking()`, only when `cancelledBy ===
WORKER`: the minutes between cancellation time and `schedule.start_time`
decide the tier — `< 30` minutes is `cancel_severe_penalty`, `30`–`120`
minutes is `cancel_medium_penalty`, `>= 120` minutes is no penalty. This
applies regardless of whether the booking was `pending` or `confirmed`,
preserving the old `worker_cancel_deduction`'s scope (which it replaces).

`booking-dispute.service.ts`, `resolveDispute()`: the no-show penalty fires
only when `resolution === FAVOR_CLIENT && dispute.reason ===
WORKER_NO_SHOW`. A `FAVOR_CLIENT` resolution transitions the booking to
`CANCELLED`, a terminal state from which it cannot be disputed again, so this
penalty cannot double-fire the way the job-completion bonus could.

### Late completion penalty (rule #9)

`booking-auto-complete.service.ts`, `completeFinishedBookings()` already
split candidates into two grace-period branches before the rework:
"started" (`IN_PROGRESS`/`PENDING_CLIENT_ACCEPTANCE`, `AUTO_COMPLETE_HOURS`
grace) and "unstarted" (`CONFIRMED`, `AUTO_COMPLETE_UNSTARTED_DAYS` grace).
Only the **started** branch triggers `late_completion_penalty` — the
unstarted branch has no evidence the appointment ever happened (possible
no-show), so it stays unpenalized and gives the benefit of the doubt. Both
branches still award the job-completion bonus (rule #6).

### Report resolution (rules #7, #8)

`moderation.service.ts`, the report-status-update path: fires only on the
transition **into** `resolved` from a different status (`justResolved =
status === RESOLVED && previousStatus !== RESOLVED`), so an admin flipping a
report back and forth cannot re-trigger the bonus/penalty. The reporter and
the report target are checked independently via
`userRepository.getUserRoleInfoById` — **note this checks
`last_active_role === WORKER`, not `roles.includes(WORKER)`** — so a
dual-role user whose `last_active_role` is currently `client` will not
receive the worker bonus/penalty from this path even if they hold the
`worker` role. A single report can award the filer and penalize the target
in the same resolution if both satisfy this check.

## Warning Notification

`reputationService.deductPoints` sends a warning notification when:

```text
previousScore >= warningThreshold AND newScore < warningThreshold
OR
previousScore < warningThreshold AND newScore < previousScore
```

Meaning: the first crossing below threshold triggers a warning, and further
deductions while already below threshold also trigger a warning. This is
unchanged by the rework and applies to both roles on their respective scales
(worker deductions call `deductPoints` the same as client deductions do).

Notification is asynchronous and failure is logged without rolling back the
score/history update.

## Daily Recovery

Job:

- File: `SERVER/src/jobs/reputation-recovery.job.ts`
- Cron: `0 0 * * *`
- Lock name: `reputation-recovery`
- Lock TTL: 10 minutes

Service: `reputationService.bulkDailyRecovery()`

Flow:

1. Get active config value `daily_recovery_points`.
2. If inactive, skip recovery and return 0.
3. Load up to 500 candidates via
   `userRepository.findReputationRecoveryCandidates()`.
4. Add recovery points with clamping at 100.
5. If the score actually changes, write history with reason
   `daily_recovery`.

**Client-only since the rework**: `findReputationRecoveryCandidates` filters
candidates with `roles: { $ne: UserRole.WORKER }`, in addition to
`reputation_score < 100`. Workers are entirely excluded from this passive
recovery mechanism — a worker's score only ever moves through an explicit
deduction/bonus event (the 12 rules above plus the pre-existing
`booking_expiry_deduction`, see "Purpose"), never a passive daily recovery.
This is the one place the pre-rework "any user below 100" behavior was
deliberately narrowed.

Recovery candidates are still limited to 500 per run.

## Migration for Existing Workers

One-time backfill script (pattern mirrors `npm run backfill:pricing-vnd`):

```bash
npm run migrate:worker-reputation            # dry-run — logs only, no writes
npm run migrate:worker-reputation -- --apply # writes scores
```

Entry point: `SERVER/src/scripts/migrate-worker-reputation.ts`. Logic:
`SERVER/src/services/reputation/worker-reputation-migration.service.ts`,
`WorkerReputationMigrationService.runManual({ apply })`.

For every existing worker, it recomputes a score from what can be inferred
**right now**, and writes both the total score and the profile component
(via `userRepository.setReputationScoreAndComponent`) so the next profile
edit computes its delta correctly:

- **Profile component**: `computeProfileCompletenessScore` against the
  worker's current `worker_profile` (photos + 10 fields).
- **Review component**: `+review_received_bonus` per existing review,
  `+five_star_review_bonus` extra per 5-star review, `-low_review_deduction`
  per review at/below the low-review threshold — from
  `reviewRepository.countAndAverageForWorker`.
- **Job component**: `+job_completion_bonus` × count of the worker's
  `completed` bookings, from `bookingRepository.countCompletedForWorker`.
- Total is clamped to `[0, 100]`.

**Deliberately not retroactive**: cancellation-tier penalties, report
penalties/bonuses, and the late-completion penalty are **not** backfilled
for past events. Those events only start counting from the day the
migration runs onward, because there is no reliable way to reconstruct
"which penalty tier applied at the time" from historical data (e.g. a
cancellation record doesn't necessarily preserve how many minutes before
start it happened relative to *that* config's thresholds). This means a
worker with a sparse history of past cancellations/reports will not be
penalized for those after migration — only going forward.

A consequence worth remembering: a worker with a bare-bones profile will see
their score drop sharply from the old flat 100 the moment this migration
applies — this is expected under the new model, not a bug.

## Review-Reputation Interaction

Reviews feed rules #3–#5 above (`review_received_bonus`,
`five_star_review_bonus`, `low_review_deduction`), all fired once at
`createReview` time.

**Reviews are immutable for clients once created.** As of the
review-immutability follow-up fix, `PATCH /api/reviews/:id` and
`DELETE /api/reviews/:id` (`review.service.ts`, `updateReview`/
`deleteReview`) reject any caller who is not an admin — the previous
"admin or owning client" check was narrowed to admin-only. This exists
specifically to close a reputation-farming loop: before this fix, a client
could create a 5-star review (+10 to the worker), delete it, and recreate it
repeatedly, each cycle awarding the review bonuses again with no bound.
Admins retain full update/delete access for moderation purposes; there is no
score-reversal logic on delete/update because the farming path is now
structurally closed rather than compensated for after the fact.

## Admin API

Routes under `/api/admin/reputation-config`:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | List all config rows. |
| `PATCH` | `/:key` | Update value and/or active flag. |

Middleware: `authenticate`, `adminOnly`.

Update payload:

```ts
{
  value?: number,  // int 0..100
  active?: boolean
}
```

Rules: at least one of `value`/`active` must be provided; `key` must be a
valid `ReputationConfigKey`; `active` can be changed only for toggleable keys.

## User API

Routes under `/api/reputation`:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/history` | Current user's reputation history. |

There is no current-user "summary" route in this repo snapshot; score is
read from user/profile payloads and history is read from `/history`.

## Frontend

- Admin reputation config page: `pr1as-client/app/dashboard/reputation-config/page.tsx`.
  Surfaces 18 of the 19 config keys, split across 2 cards ("Trừ điểm" /
  deductions, and "Cộng điểm & cảnh báo" / bonuses & warnings). The
  deprecated `worker_cancel_deduction` is deliberately left out of both the
  card filter arrays and `orderedKeys` — it is dead in the backend too, so
  there is nothing for the admin to configure.
- `pr1as-client/services/reputation-config.service.ts` independently defines
  its own `ReputationConfigKey` union type and `TOGGLEABLE_REPUTATION_KEYS`
  array (not imported from the backend) — both were updated to carry all 19
  backend keys as part of the same follow-up that built the admin UI cards.
  Keep this file in sync by hand if the backend enum changes again.
- User/profile displays: worker profile/header components read
  `meta_data.reputation_score`.
- Reputation hooks/services wrap history/config endpoints.

## Common Implementation Checklist

When changing reputation behavior:

1. Use `getActiveValue` for every point-changing rule so disabled configs are
   honored — this was the source of one post-review bug (profile-completeness
   bonuses used `getValue` and ignored the toggle).
2. Use `getValue` for thresholds (`low_review_threshold`,
   `min_profile_photos_threshold`, `warning_threshold`) — they are not toggleable.
3. Pass the correct `defaultScore` to `adjustReputationScore`/`deductPoints`/
   `recoverPoints`: `0` for worker-only rules, `100` (the default parameter)
   for client-only rules. Getting this wrong silently treats a scoreless
   worker as if they had 100 points.
4. When adding any code path that reads `meta_data.reputation_score` with a
   fallback, check role first (`roles.includes(WORKER) ? 0 : 100`) unless the
   role at that call site is already unambiguous.
5. Write history after every actual score change.
6. Keep score clamped to 0..100.
7. Keep notifications asynchronous so score updates do not fail because of
   notification delivery.
8. If adding a new deduction/recovery reason: add the enum value
   (`ReputationConfigKey` + `ReputationHistoryReason`), a config default (with
   correct toggleable-ness), the history handling, the admin-UI label in
   `CONFIG_META`/`orderedKeys` (both backend and the frontend's independent
   duplicate type), and update this memory-bank doc together.
9. If a change touches the 4 worker-reputation-reset sites (`becomeWorker`,
   `updateWorkerProfile`, `createByAdmin`, `updateUserByAdmin`), keep all 4 in
   parity — a fix that lands in one but not the others is exactly the bug
   that `updateUserByAdmin` had until the follow-up fix.

## Known Implementation Nuances

- Config cache can be stale for up to 5 minutes unless invalidated by an
  update through `ReputationConfigService`.
- `worker_cancel_deduction` is a dead config key/history reason kept only for
  backward-compatible history rows — no code writes it, and the admin UI
  intentionally hides it.
- Daily recovery excludes workers entirely (`roles: { $ne: WORKER }` in
  `findReputationRecoveryCandidates`); only clients passively recover.
- Recovery processes up to 500 candidates per daily run.
- The migration script is not retroactive for cancellation/report/late-
  completion penalties by design — see "Migration for Existing Workers".
- Report-resolution bonus/penalty checks `last_active_role === WORKER`
  (via `getUserRoleInfoById`), not `roles.includes(WORKER)` — a dual-role
  user currently active as a client will not get the worker bonus/penalty
  from this path even if they hold the worker role.
- Reviews are immutable for clients (admin-only update/delete) specifically
  to prevent farming the review-received/five-star bonuses; there is no
  score-reversal logic on review delete/update because the loop is closed
  structurally instead.
- Score summary is not exposed as a dedicated `/api/reputation` route in the
  current route file; most screens rely on user/profile data.
