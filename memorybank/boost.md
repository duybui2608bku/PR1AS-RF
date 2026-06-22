# Memory Bank - Boost and Worker Points

## Purpose

The boost module gives workers a point wallet and lets them spend points to make
their profiles rank higher in worker discovery. Points are earned from daily
attendance, package-purchase bonuses, and admin adjustments. Boost activation is
currently point-based: a worker spends points, gets one active boost, and the
boost expires after the configured duration.

Primary source files:

- Constants: `SERVER/src/constants/boost.ts`
- Models: `SERVER/src/models/boost/*`
- Services: `SERVER/src/services/boost/*`
- Repositories: `SERVER/src/repositories/boost/*`
- Worker discovery integration: `SERVER/src/services/worker/worker.service.ts`
- Routes: `SERVER/src/routes/boost/boost.routes.ts` and
  `SERVER/src/routes/boost/boost-admin.routes.ts`
- Validation: `SERVER/src/validations/boost/boost.validation.ts`
- Frontend API: `pr1as-client/services/boost.service.ts`
- Worker page: `pr1as-client/app/worker/boost/page.tsx`
- UI components: `pr1as-client/components/worker/attendance-widget.tsx` and
  `pr1as-client/components/worker/boost-panel.tsx`

## Concepts

Boost types:

| Type | Tier | Meaning |
| --- | ---: | --- |
| `featured` | 1 | Highest boosted priority in worker listings. |
| `basic` | 2 | Boosted, but below featured workers. |

Boost statuses:

| Status | Meaning |
| --- | --- |
| `active` | Boost is active and `expires_at` is in the future. |
| `expired` | Boost has expired or has been marked expired by cron/repository logic. |

Point reasons:

| Reason | Meaning |
| --- | --- |
| `attendance` | Daily check-in base points. |
| `attendance_streak_bonus` | Bonus when streak hits configured interval. |
| `attendance_monthly_bonus` | Bonus when streak reaches 30. |
| `gold_package` | Points awarded after a Gold plan purchase. |
| `diamond_package` | Points awarded after a Diamond plan purchase. |
| `boost_spend` | Points spent to activate a boost. |
| `admin_adjust` | Admin manual adjustment. |

## Config

Collection: `boost_config`.

Default config from `DEFAULT_BOOST_CONFIG`:

| Field | Default | Validation |
| --- | ---: | --- |
| `attendance_points` | 5 | int >= 0 |
| `attendance_streak_day` | 7 | int >= 1 |
| `attendance_streak_bonus` | 25 | int >= 0 |
| `attendance_monthly_bonus` | 100 | int >= 0 |
| `gold_package_points` | 50 | int >= 0 |
| `diamond_package_points` | 150 | int >= 0 |
| `basic_boost_cost` | 50 | int >= 1 |
| `basic_boost_duration_hours` | 6 | int >= 1 |
| `featured_boost_cost` | 400 | int >= 1 |
| `featured_boost_duration_hours` | 72 | int >= 1 |
| `rotation_interval_minutes` | 30 | int >= 5 |

`boostConfigRepository.get()` returns the single config document, creating it
from defaults if missing. Admin updates overwrite the provided fields and set
`updated_by`/`updated_at`.

Admin routes:

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/admin/boost/config` | Admin | Read effective config. |
| `PUT` | `/api/admin/boost/config` | Admin | Update config fields. |
| `POST` | `/api/admin/boost/adjust-points` | Admin | Manually credit/debit worker points. |

Admin point adjustment payload:

```ts
{
  user_id: string,
  delta: number, // non-zero int
  note: string,  // 1..500 chars
}
```

## Data Model

### WorkerPointWallet

Collection: `worker_point_wallet`.

Fields:

| Field | Meaning |
| --- | --- |
| `user_id` | Worker user id; unique. |
| `balance` | Current available point balance. |
| `total_earned` | Lifetime earned points. |
| `total_spent` | Lifetime spent points. |
| `attendance_streak` | Current attendance streak count. |
| `last_attendance_date` | Last attendance date. |
| `created_at`, `updated_at` | Timestamps. |

`workerPointWalletRepository.findOrCreate(userId)` creates a wallet lazily.

`atomicAdjust(userId, delta)`:

- Credits positive deltas.
- Debits negative deltas only if current balance is enough.
- Returns null if a debit would make balance negative.
- Updates `total_earned` or `total_spent` based on the delta sign.

### Attendance

Collection: `attendance`.

Fields:

| Field | Meaning |
| --- | --- |
| `user_id` | Worker user id. |
| `date` | Day string in `YYYY-MM-DD`. |
| `streak_at_time` | Streak value when checked in. |
| `points_earned` | Total points earned for that check-in. |
| `created_at` | Timestamp. |

Unique index:

```text
{ user_id: 1, date: 1 }
```

This enforces one check-in per worker per calendar day.

### PointHistory

Collection: `point_history`.

Fields:

| Field | Meaning |
| --- | --- |
| `user_id` | Worker user id. |
| `delta` | Positive earn or negative spend. |
| `reason` | Point reason enum. |
| `balance_after` | Wallet balance after the event. |
| `meta.admin_note` | Optional admin adjustment note. |
| `meta.admin_id` | Optional admin id. |
| `meta.boost_id` | Optional boost id for spend events. |
| `created_at` | Timestamp. |

### WorkerBoost

Collection: `worker_boost`.

Fields:

| Field | Meaning |
| --- | --- |
| `user_id` | Worker user id. |
| `boost_type` | `basic` or `featured`. |
| `tier` | Sort tier: featured = 1, basic = 2. |
| `cost_points` | Points spent at activation time. |
| `started_at` | Activation timestamp. |
| `expires_at` | Expiry timestamp. |
| `status` | `active` or `expired`. |
| `created_at` | Timestamp. |

Indexes:

- `user_id + status`
- `status + expires_at`

## Attendance Flow

Route: `POST /api/boost/attendance`

Middleware:

- `authenticate`
- `workerOnly`

Service: `attendanceService.checkIn(userId)`.

Flow:

1. Compute today's date as `YYYY-MM-DD` with `dayjs()`.
2. If attendance exists for today:
   - Return current wallet values.
   - `points_earned = 0`.
   - `already_checked_in = true`.
   - No history records are created.
3. Load boost config and worker point wallet.
4. Determine new streak:
   - If `last_attendance_date` is yesterday, increment current streak.
   - Otherwise reset streak to 1.
5. Calculate points:
   - Base: `attendance_points`.
   - Streak bonus: if `newStreak % attendance_streak_day === 0`.
   - Monthly bonus: if `newStreak === 30`.
6. In one MongoDB transaction:
   - Insert attendance row.
   - Update wallet attendance metadata.
   - Add base points and write point history.
   - Add streak bonus and write point history if applicable.
   - Add monthly bonus and write point history if applicable.
7. Return total points earned, streak, final balance, bonuses, and
   `already_checked_in=false`.

Important behavior:

- A 30-day streak can receive both a streak bonus and monthly bonus if 30 is a
  multiple of the configured streak day.
- Calendar day is based on server time via `dayjs()`, not a user-specific time
  zone setting.

## Point Wallet and History

Route: `GET /api/boost/points?limit=&offset=`

Middleware:

- `authenticate`
- `workerOnly`

Behavior:

- `limit` defaults to 20 and is capped at 50.
- `offset` defaults to 0.
- Response contains `wallet` and `history`.
- Wallet is created lazily if missing.

History is sorted by newest first in the repository.

## Boost Activation

Route: `POST /api/boost/activate`

Middleware:

- `authenticate`
- `workerOnly`

Payload:

```ts
{
  boost_type: "basic" | "featured"
}
```

Service: `boostService.activate(userId, boostType)`.

Rules:

1. Worker can have only one active boost at a time.
2. Active means `status=active` and `expires_at > now`.
3. Cost and duration are loaded from `BoostConfig`:
   - `basic` uses `basic_boost_cost` and `basic_boost_duration_hours`.
   - `featured` uses `featured_boost_cost` and `featured_boost_duration_hours`.
4. Worker must have enough point balance.
5. Expiry = now + configured duration hours.
6. In one MongoDB transaction:
   - Atomically deduct points.
   - Create `WorkerBoost`.
   - Write `PointHistory` with reason `boost_spend` and `boost_id`.
7. Response returns boost type, expiry, points spent, and balance after spend.

No pricing-plan check currently runs in backend boost activation. The current
runtime gate is point balance plus one-active-boost rule.

## Boost Status and Expiry

Route: `GET /api/boost/status`

Returns:

```ts
{
  is_active: boolean,
  boost_type: "basic" | "featured" | null,
  expires_at: Date | null,
  seconds_remaining: number | null,
}
```

The status query only treats future active boosts as active.

Repository expiry:

- `workerBoostRepository.expireOverdue()` marks all active boosts whose
  `expires_at <= now` as `expired`.
- The repository method exists for a cron/background flow, but no
  `boost-expiration.job.ts` is currently listed in this repo snapshot. Discovery
  and status queries still ignore expired-by-time boosts even if status has not
  been updated yet.

## Discovery Integration

Worker discovery integration lives in `WorkerService.getWorkersGroupedByService`.

Flow:

1. Worker search builds grouped workers by service.
2. It collects all worker ids in the result set.
3. It fetches active boosts for those worker ids.
4. It fetches boost config for `rotation_interval_minutes`.
5. It annotates each worker with:

```ts
boost: {
  is_boosted: boolean,
  boost_type: "featured" | "basic" | null,
  boost_tier: 1 | 2 | null,
}
```

6. It sorts workers inside each service group by:
   - boost tier first (`featured` before `basic` before unboosted);
   - deterministic scatter inside the same tier.

Rotation:

```text
slotId = floor(Date.now() / (rotation_interval_minutes * 60 * 1000))
scatter = (parseInt(workerId.last4Hex, 16) + slotId) % 1000
sort key = [tier, scatter]
```

This rotates exposure among workers in the same boost tier while keeping the
order deterministic for a given rotation slot.

## Pricing Interaction

Pricing package fields include:

- `boost_profile_enabled`
- `boost_profile_monthly_limit`

Current state:

- Pricing purchase awards boost points in `PricingService.upgrade` based on the
  plan's boost allowance, valued at the featured-boost cost:
  - `allowance = boost_profile_monthly_limit × featured_boost_cost × duration_months`
    (allowance is `0` when `boost_profile_enabled` is false or the limit is null).
  - Plus a flat bonus from `gold_package_points` (Gold) or
    `diamond_package_points` (Diamond).
  - Total `delta = allowance + flatBonus`; awarded only when `> 0`, with reason
    `gold_package`/`diamond_package`. Runs outside the payment transaction so a
    point-award failure never rolls back the purchase.
- Backend boost activation does not currently enforce
  `boost_profile_enabled` or `boost_profile_monthly_limit`.
- Public/admin pricing UI displays those fields as package capabilities.

If product requirements need package-based boost gating, enforce it in
`boostService.activate` using the active DB `PricingPackage`; do not rely only
on frontend display.

## Frontend

Worker page: `/worker/boost`

Main surfaces:

- Current point balance card.
- `AttendanceWidget` for daily check-in.
- "How to earn" explanatory list.
- `BoostPanel` for activation and point history.

Frontend API:

- `boostService.checkIn()`
- `boostService.getPoints(limit, offset)`
- `boostService.activateBoost(boostType)`
- `boostService.getStatus()`
- Admin:
  - `boostService.getConfig()`
  - `boostService.updateConfig(payload)`
  - `boostService.adjustPoints(userId, delta, note)`

Known frontend nuance:

- `BoostPanel` currently hard-codes displayed costs and durations:
  - Basic: 50 points / 6 hours
  - Featured: 400 points / 72 hours
- Backend activation uses live `BoostConfig`. If admin changes config, UI can
  show stale cost/duration even though backend charges the configured values.
  The panel should fetch `/admin/boost/config` or a worker-safe config endpoint
  before treating those values as live.

## API Surface

Worker routes under `/api/boost`:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/attendance` | Daily check-in and point award. |
| `GET` | `/points` | Wallet and point history. |
| `POST` | `/activate` | Spend points to activate a boost. |
| `GET` | `/status` | Current active boost status. |

Admin routes under `/api/admin/boost`:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/config` | Read boost config. |
| `PUT` | `/config` | Update boost config fields. |
| `POST` | `/adjust-points` | Manual point credit/debit. |

## Common Implementation Checklist

When changing boost behavior:

1. Decide whether a value comes from `BoostConfig` or is only a display default.
2. Keep frontend costs/durations in sync with backend config.
3. Preserve atomic wallet deduction plus boost creation in a transaction.
4. Keep one-active-boost behavior unless product explicitly allows stacking.
5. If adding pricing-plan gating, load DB pricing package and document whether
   limits reset monthly.
6. If adding a cron job for boost expiry, use job-lock pattern like other jobs.
7. When changing discovery sorting, preserve deterministic rotation so equal
   boosted workers get shared exposure.

