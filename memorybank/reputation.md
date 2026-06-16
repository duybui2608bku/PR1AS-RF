# Memory Bank - Reputation System

## Purpose

Reputation is a 0..100 score stored on users, mainly used to protect booking and
worker marketplace quality. Negative booking/review events deduct points,
warnings are sent when a score crosses a threshold, and a daily recovery job can
restore points over time.

Primary source files:

- Config types/defaults: `SERVER/src/types/reputation/reputation-config.types.ts`
- History types: `SERVER/src/types/reputation/reputation-history.types.ts`
- Config model: `SERVER/src/models/reputation-config/reputation-config.model.ts`
- History model: `SERVER/src/models/reputation-history.model.ts`
- Services: `SERVER/src/services/reputation/*`
- Repositories: `SERVER/src/repositories/reputation/*`
- User score adjustment: `SERVER/src/repositories/auth/user.repository.ts`
- Routes: `SERVER/src/routes/reputation/*`
- Job: `SERVER/src/jobs/reputation-recovery.job.ts`
- Frontend services/hooks:
  - `pr1as-client/services/reputation.service.ts`
  - `pr1as-client/services/reputation-config.service.ts`
  - `pr1as-client/lib/hooks/use-reputation.ts`
  - `pr1as-client/lib/hooks/use-reputation-config.ts`

## Score Storage

Current score is stored on the user:

```ts
User.meta_data.reputation_score
```

Rules:

- Default score is 100.
- Score is clamped to 0..100 by `userRepository.adjustReputationScore`.
- Missing score is treated as 100.
- User model indexes `meta_data.reputation_score`.

Atomic adjustment:

- `adjustReputationScore(id, delta)` uses a MongoDB aggregation update.
- It clamps with `$max(0, $min(100, current + delta))`.
- It returns previous and new score from a single read-modify-write operation.

Marketplace effects:

- Booking creation rejects clients with reputation below 30.
- Worker profile booking UI disables booking workers whose displayed reputation
  is below 30.
- Post creation rejects users with reputation below 30.
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

Config keys and defaults:

| Key | Default | Toggleable | Meaning |
| --- | ---: | --- | --- |
| `booking_expiry_deduction` | 10 | yes | Deduct worker when pending booking expires. |
| `worker_cancel_deduction` | 10 | yes | Deduct worker when worker cancels. |
| `client_late_cancel_deduction` | 5 | yes | Deduct client for late cancel. |
| `low_review_deduction` | 5 | yes | Deduct worker for a low review. |
| `low_review_threshold` | 2 | no | Rating at/below this is low. |
| `daily_recovery_points` | 5 | yes | Daily recovery amount. |
| `warning_threshold` | 70 | no | Warning threshold. |

Toggleable keys:

- `booking_expiry_deduction`
- `worker_cancel_deduction`
- `client_late_cancel_deduction`
- `low_review_deduction`
- `daily_recovery_points`

Threshold keys are not toggleable:

- `low_review_threshold`
- `warning_threshold`

`reputationConfigService.updateConfig` rejects attempts to toggle threshold
keys on/off.

## Config Caching and Seeding

`ReputationConfigService` keeps an in-memory cache:

- TTL: 5 minutes.
- `getValue(key)` returns numeric value regardless of active flag.
- `isActive(key)` returns active flag.
- `getActiveValue(key)` returns the value when active, otherwise `null`.

When a config is updated:

- Repository upserts the config row.
- Service invalidates only the updated key from cache.

Default seeding:

- `reputationConfigService.seedDefaults()` is called from app bootstrap.
- It inserts missing config rows with default values.
- It backfills `active: true` on legacy rows missing the active field.

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

Reasons:

| Reason | Meaning |
| --- | --- |
| `booking_expiry` | Worker did not confirm before deadline. |
| `worker_cancel` | Worker cancelled booking. |
| `client_late_cancel` | Client cancelled too close to start time. |
| `low_review` | Worker received low review. |
| `daily_recovery` | Recovery job restored points. |
| `manual` | Generic/manual reason. |

History list route:

```text
GET /api/reputation/history?page=&limit=
```

Rules:

- Authenticated user only.
- Returns only the current user's history.
- Sorted newest first.
- `limit` uses validation max from `VALIDATION_LIMITS.PAGINATION_MAX_LIMIT`.

## Deduction Events

### Booking Expiry

Source:

- `SERVER/src/services/booking/booking-expiration.service.ts`

When:

- Pending booking passes worker confirmation deadline.

Effect:

- Booking status becomes `expired`.
- Worker score is deducted by active config
  `booking_expiry_deduction`.
- History reason: `booking_expiry`.

If the config is inactive:

- `getActiveValue` returns `null`.
- Deduction is skipped.

### Worker Cancellation

Source:

- `SERVER/src/services/booking/booking-status.service.ts`

When:

- Worker cancels a booking through cancel flow.

Effect:

- Worker score is deducted by active config `worker_cancel_deduction`.
- History reason: `worker_cancel`.

Current behavior:

- The code deducts for worker cancellation regardless of whether the booking was
  `pending` or `confirmed`, as long as the cancel route succeeds.

### Client Late Cancellation

Source:

- `SERVER/src/services/booking/booking-status.service.ts`

When:

- Client cancels a booking less than
  `BOOKING_LIMITS.CANCELLATION_FREE_HOURS` before start time.
- Original booking status was not `pending`.

Effect:

- Client score is deducted by active config
  `client_late_cancel_deduction`.
- History reason: `client_late_cancel`.

No deduction:

- Client cancels while booking is still `pending`.
- Client cancels confirmed booking more than 24 hours before start.
- Admin cancels.

### Low Review

Source:

- `SERVER/src/services/review/review.service.ts`

When:

- Client creates a review for a completed booking.
- `rating <= low_review_threshold`.
- `low_review_deduction` is active.

Effect:

- Worker score is deducted by `low_review_deduction`.
- History reason: `low_review`.

## Warning Notification

`reputationService.deductPoints` sends a warning notification when:

```text
previousScore >= warningThreshold AND newScore < warningThreshold
OR
previousScore < warningThreshold AND newScore < previousScore
```

Meaning:

- First crossing below threshold triggers warning.
- Further deductions while already below threshold also trigger warning.

Notification is asynchronous and failure is logged without rolling back the
score/history update.

## Daily Recovery

Job:

- File: `SERVER/src/jobs/reputation-recovery.job.ts`
- Cron: `0 0 * * *`
- Lock name: `reputation-recovery`
- Lock TTL: 10 minutes

Service:

- `reputationService.bulkDailyRecovery()`

Flow:

1. Get active config value `daily_recovery_points`.
2. If inactive, skip recovery and return 0.
3. Load up to 500 users whose reputation score is below 100.
4. Add recovery points with clamping at 100.
5. If the score actually changes, write history with reason `daily_recovery`.

Important:

- Recovery candidates are limited to 500 per run.
- Recovery is not based on user role; any user below 100 can be recovered by
  the repository query.

## Admin API

Routes under `/api/admin/reputation-config`:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | List all config rows. |
| `PATCH` | `/:key` | Update value and/or active flag. |

Middleware:

- `authenticate`
- `adminOnly`

Update payload:

```ts
{
  value?: number,  // int 0..100
  active?: boolean
}
```

Rules:

- At least one of `value` or `active` must be provided.
- `key` must be a valid `ReputationConfigKey`.
- `active` can be changed only for toggleable keys.

## User API

Routes under `/api/reputation`:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/history` | Current user's reputation history. |

There is no current-user "summary" route in this repo snapshot; score is read
from user/profile payloads and history is read from `/history`.

## Frontend

Known surfaces:

- Admin reputation config page: `/dashboard/reputation-config`
- User/profile displays: worker profile/header components read
  `meta_data.reputation_score`.
- Reputation hooks/services wrap history/config endpoints.

## Common Implementation Checklist

When changing reputation behavior:

1. Use `getActiveValue` for point-changing rules so disabled configs are
   honored.
2. Use `getValue` for thresholds because threshold keys are not toggleable.
3. Write history after every actual score change.
4. Keep score clamped to 0..100.
5. Keep notifications asynchronous so score updates do not fail because of
   notification delivery.
6. If adding a new deduction/recovery reason, add enum, config key if needed,
   history handling, admin docs, and memory bank notes together.

## Known Implementation Nuances

- Config cache can be stale for up to 5 minutes unless invalidated by an update
  through `ReputationConfigService`.
- Worker cancellation currently deducts even if the booking was only pending.
- Recovery processes up to 500 candidates per daily run.
- Score summary is not exposed as a dedicated `/api/reputation` route in the
  current route file; most screens rely on user/profile data.

