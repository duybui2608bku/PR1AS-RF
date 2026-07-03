# Memory Bank - Booking System

## Purpose

Bookings are the reservation workflow between a client and a worker. A booking
reserves a worker service for a scheduled time range, moves through a strict
status machine, and connects to notifications, reputation, reviews, worker
availability, and complaint group chat.

The booking module is not a payment or escrow module. It does not hold funds,
transfer money, release payouts, or refund balances. The booking record stores a
pricing unit and quantity so both sides know what was selected, while the worker
service price remains the display/source pricing data.

Primary source files:

- Backend constants: `SERVER/src/constants/booking.ts`
- Backend validation: `SERVER/src/validations/booking/booking.validation.ts`
- Backend model: `SERVER/src/models/booking/booking.model.ts`
- Backend services: `SERVER/src/services/booking/*`
- Backend repository: `SERVER/src/repositories/booking/booking.repository.ts`
- Frontend create dialog: `pr1as-client/components/worker/book-worker-dialog.tsx`
- Client bookings UI: `pr1as-client/app/client/bookings/*`
- Worker bookings UI: `pr1as-client/app/worker/bookings/*`
- User-facing guide: `docs/booking-flow.html` and `docs/booking-flow.pdf`

## Domain Model

Collection: `booking` via `SERVER/src/models/booking/booking.model.ts`.

Core fields:

| Field | Meaning |
| --- | --- |
| `client_id` | User who created the booking. `null` for guest (quick) bookings. |
| `is_guest` | `true` for a guest/quick booking created without an account. Default `false`. |
| `public_ref` | Public tracking code for guest bookings, format `QB-XXXXXXXX` (8 hex chars). Unique sparse index. `null` for normal bookings. |
| `guest_contact` | Guest `{ name, email, phone }` for quick bookings, else `null`. |
| `guest_locale` | Guest's preferred locale for emails (`vi`/`en`/`ko`/`zh`), else `null`. |
| `worker_id` | Worker being booked. |
| `worker_service_id` | Specific active `WorkerService` selected by the client. |
| `service_id` | Catalog service id. |
| `service_code` | Uppercase service-code snapshot. |
| `schedule.start_time` | Booking start time. |
| `schedule.end_time` | Booking end time. |
| `schedule.duration_hours` | Derived duration in hours, rounded to 1 decimal by validation. |
| `pricing.unit` | Selected pricing unit: `HOURLY`, `DAILY`, or `MONTHLY`. |
| `pricing.quantity` | Positive integer quantity for that unit. |
| `status` | Booking lifecycle status. Defaults to `pending`. |
| `client_notes` | Optional client note, max 1000 chars. |
| `worker_response` | Optional worker response/note, max 1000 chars. |
| `confirmed_at` | Set when status becomes `confirmed`. |
| `started_at` | Set when status becomes `in_progress`. |
| `completed_at` | Set when status becomes `completed`. |
| `cancellation` | Cancellation metadata when the cancel flow is used. |
| `dispute` | Dispute metadata and resolution metadata. |
| `disputed_at` | Top-level dispute timestamp for querying/reporting. |
| `created_at`, `updated_at` | Manual timestamps. |

Important indexes:

- `client_id + created_at`
- `worker_id + created_at`
- `status`
- `worker_id + status + schedule.start_time`
- `schedule.start_time + schedule.end_time`
- `service_code`
- Partial unique index `uniq_active_booking_worker_start_time` on
  `{ worker_id, schedule.start_time }` for schedule-blocking statuses. This is
  a race-condition guard for same-worker same-start-time bookings.

## Statuses

`BookingStatus` values:

| Status | Meaning |
| --- | --- |
| `pending` | Client created the booking; worker has not accepted/rejected yet. |
| `confirmed` | Worker accepted the booking. |
| `in_progress` | Worker started the service. |
| `pending_client_acceptance` | Worker marked the service done; client must accept or dispute. |
| `completed` | Client accepted completion, or admin resolved dispute in favor of worker. |
| `cancelled` | Booking was cancelled by client, worker, admin, or system. |
| `rejected` | Worker rejected the booking before confirming. |
| `disputed` | Participant opened a dispute; admin must resolve it. |
| `expired` | System expired an unconfirmed pending booking. |

Schedule-blocking statuses:

```ts
[
  "pending",
  "confirmed",
  "in_progress",
  "pending_client_acceptance",
]
```

These statuses block the worker's schedule in conflict checks. `disputed` is
not in `BOOKING_SCHEDULE_BLOCKING_STATUSES`, but the worker schedule endpoint
includes disputed bookings when showing worker calendar ranges.

## Status Machine

Allowed transitions from `BOOKING_STATUS_TRANSITIONS`:

| From | To | Actor / route |
| --- | --- | --- |
| `pending` | `confirmed` | Worker via `PATCH /api/bookings/:id/status`. |
| `pending` | `rejected` | Worker via `PATCH /api/bookings/:id/status`. |
| `pending` | `cancelled` | Owner/admin transition exists, but use cancel route for metadata. |
| `pending` | `expired` | System expiration service. |
| `confirmed` | `in_progress` | Worker via status route. |
| `confirmed` | `cancelled` | Client/worker/admin via cancel route. |
| `in_progress` | `pending_client_acceptance` | Worker via status route. |
| `in_progress` | `disputed` | Client or worker via dispute route. |
| `pending_client_acceptance` | `completed` | Client via status route. |
| `pending_client_acceptance` | `disputed` | Client or worker via dispute route. |
| `disputed` | `completed` | Admin resolves dispute in favor of worker. |
| `disputed` | `cancelled` | Admin resolves dispute in favor of client. |

Terminal statuses:

- `completed`
- `cancelled`
- `rejected`
- `expired`

Implementation note: the generic status route can technically set
`status=cancelled` from allowed states without filling `cancellation`. Use
`PATCH /api/bookings/:id/cancel` for real cancellation flows so cancellation
metadata, notifications, and reputation side effects stay correct.

## Creating a Booking

Route: `POST /api/bookings`

Middleware and controller path:

```text
routes/booking -> authenticate -> bookingCreateLimiter -> controller validation -> BookingCrudService.createBooking -> bookingRepository.createIfNoConflict
```

Request payload:

```ts
{
  worker_id: ObjectId,
  worker_service_id: ObjectId,
  service_id: ObjectId,
  service_code: string,
  schedule: {
    start_time: Date,
    end_time: Date,
  },
  pricing: {
    unit: "HOURLY" | "DAILY" | "MONTHLY",
    quantity: number,
  },
  client_notes?: string,
}
```

Validation and business rules:

| Rule | Source |
| --- | --- |
| `start_time < end_time`. | `scheduleSchema` |
| Start must be at least 2 hours from now. | `BOOKING_LIMITS.MIN_ADVANCE_HOURS` |
| Start must be no more than 30 days from now. | `BOOKING_LIMITS.MAX_ADVANCE_DAYS` |
| `duration_hours` is computed from start/end and rounded to 1 decimal. | `scheduleSchema.transform` |
| `pricing.unit` must be `HOURLY`, `DAILY`, or `MONTHLY`. | `PricingUnit` |
| `pricing.quantity` must be a positive integer. | `pricingSchema` |
| `client_notes` is trimmed and capped at 1000 chars. | `createBookingSchema` |
| Client cannot book themself. | `BookingCrudService.createBooking` |
| Client reputation must be at least 30. | `BookingCrudService.createBooking` |
| Worker must not have an active `WORKER_ACTIVITY` moderation restriction. | `moderationService.assertNoActiveRestriction` |
| Worker must exist, be active, have verified email, and include worker role. | `BookingCrudService` and transaction worker lock |
| `worker_service_id` must belong to the worker and be active. | `validateWorkerService` |
| `service_id` must exist. | `serviceRepository.findById` |
| Schedule must not overlap existing blocking bookings or worker blackouts. | `bookingRepository.checkScheduleConflict` |

Concurrency behavior:

- Creation runs inside a MongoDB transaction.
- The repository locks the worker row by incrementing `booking_lock_version`.
- It rechecks worker eligibility and schedule conflict inside the transaction.
- It catches duplicate-key errors from `uniq_active_booking_worker_start_time`
  and returns a schedule conflict.

Schedule conflict definition:

```text
Existing booking conflicts when:
  existing.start >= requested.start and existing.start < requested.end
  OR existing.end > requested.start and existing.end <= requested.end
  OR existing.start <= requested.start and existing.end >= requested.end

Worker blackout conflicts when:
  blackout.start < requested.end AND blackout.end > requested.start
```

Blocked statuses during conflict checks:

- `pending`
- `confirmed`
- `in_progress`
- `pending_client_acceptance`

Creation side effects:

- New booking starts as `pending`.
- Booking-created notification is queued asynchronously.
- No wallet operation is performed.

## Guest (Quick) Booking

Guests can reserve a worker without creating an account ("quick book"), then
look the booking up later with a tracking code. This reuses the same `booking`
collection and status machine; the difference is identity (no `client_id`) and
an email-based tracking flow.

Routes:

| Method | Path | Auth | CSRF | Rate limit | Purpose |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/bookings/quickbook` | Public | Yes | `guestBookingCreateLimiter` (8/hour) | Create a guest booking. |
| `GET` | `/api/bookings/lookup` | Public | No | - | Look up a guest booking by code + email. |

These two routes are declared **before** the authenticated booking routes in
`booking.routes.ts`, so `GET /lookup` is matched ahead of the `GET /:id`
authenticated route.

### Create flow

Path: `routes/booking -> csrfProtection -> guestBookingCreateLimiter ->
BookingController.createGuestBooking -> BookingCrudService.createGuestBooking ->
bookingRepository.createIfNoConflict`.

`createGuestBookingSchema` payload:

```ts
{
  guest_contact: {
    name: string,   // trimmed, 1..120
    email: string,  // email, max 255
    phone?: string, // trimmed, max 30, default ""
  },
  guest_locale?: "vi" | "en" | "ko" | "zh",
  worker_id: ObjectId,
  worker_service_id: ObjectId,
  service_id: ObjectId,
  service_code: string,
  schedule: { start_time, end_time },  // same scheduleSchema as normal create
  pricing: { unit, quantity },
  client_notes?: string,               // max 1000
}
```

Behaviour and differences from the authenticated create:

- Same advance-window, schedule-conflict, worker-eligibility, and active
  `WORKER_ACTIVITY` moderation checks apply.
- There is **no client reputation check** and **no self-booking check** (there
  is no client account).
- The record is written with `client_id: null`, `is_guest: true`, a generated
  `public_ref` (`QB-` + 8 uppercase hex), normalized `guest_contact` (trimmed
  name, lowercased email, `phone || null`), and `guest_locale`.
- `guest_locale` falls back to the request `Accept-Language` header and then to
  `"en"` when not provided.
- Side effects: emits the standard `bookingCreated` notification to the worker,
  and calls `sendQuickBookingCreatedEmails` (see below). No wallet operation.

### Tracking emails

`SERVER/src/services/booking/booking-email.ts` sends localized guest emails
(supported email locales: `en`, `vi`, `ko`, `zh`):

- `sendQuickBookingCreatedEmails` (on create): always emails the **guest** a
  confirmation with a tracking link. It additionally emails the **worker** a
  quick-booking request, but only as a fallback when the worker's `EMAIL`
  notification channel is disabled - otherwise the normal `bookingCreated`
  notification already covers email and this avoids a duplicate.
- `sendQuickBookingStatusEmail` (on status change and on cancel, from
  `booking-status.service.ts`): emails the guest when their booking status
  changes. It is a no-op for non-guest bookings and for the `pending` status.

Tracking link format: `${frontendUrl}/booking-lookup?code=<public_ref>&email=<guest_email>`.

### Lookup flow

`GET /api/bookings/lookup` validates `guestBookingLookupQuerySchema`
(`public_ref` 1..64, `email`) and calls
`bookingRepository.findGuestBookingByPublicRef(public_ref, email)`. **Both** the
code and the email must match the stored guest booking; otherwise it returns
`404 BOOKING_NOT_FOUND`. No authentication is required.

Guest bookings cannot be reached through `GET /:id` (that route requires auth
and an owner match, and guests have `client_id: null`). The lookup endpoint is
the only read path for a guest.

### Worker-side handling

Workers see guest bookings in their normal list via `GET /api/bookings/my` and
act on them through the same status routes. `getBookingsQuerySchema` accepts an
`is_guest` boolean filter so the worker UI can isolate guest bookings.

### Frontend surfaces

- `pr1as-client/app/quick-booking/page.tsx` + `quick-booking-wizard.tsx`: the
  standalone guest booking wizard (info -> service/date/time -> review ->
  success), guest-only, no auth required; shows the tracking code and links to
  `/booking-lookup`.
- `pr1as-client/components/worker/quick-booking-dialog.tsx`: the same flow as a
  modal launched from a worker profile, with worker/service pre-selected.
- `pr1as-client/app/booking-lookup/page.tsx` + `booking-lookup-client.tsx`: the
  guest tracking page; prefills `code`/`email` from URL params.
- Service: `bookingService.createGuestBooking` (POST `/bookings/quickbook`) and
  `bookingService.lookupGuestBooking` (GET `/bookings/lookup`) in
  `services/booking.service.ts`. Hook: `useCreateGuestBooking` in
  `lib/hooks/use-bookings.ts`.
- i18n namespaces: `QuickBooking.*` and `BookingLookup.*` in
  `messages/{en,vi,zh}.json`.

## Frontend Booking Flow

Entry point: worker profile service card.

Client flow in `BookWorkerDialog`:

1. Client chooses an active worker service.
2. Dialog loads worker schedule for today through the next 30 days.
3. Calendar disables dates before today, after 30 days, and only days that are
   **fully booked** (no free hour slot). Partially booked days stay selectable
   and are flagged with an amber "some slots left" modifier; the start-time
   dropdown then disables just the hours that overlap an existing booking. This
   per-slot logic mirrors the backend half-open overlap check so a partial-day
   booking never blocks the rest of the day for other clients.
4. Client selects pricing unit from the worker service's pricing array.
5. Client selects start time from hourly options `06:00` through `21:00`.
6. Client enters quantity.
7. Frontend computes end time:
   - `HOURLY`: `quantity * 1 hour`
   - `DAILY`: `quantity * 24 hours`
   - `MONTHLY`: `quantity * 30 * 24 hours`
8. Frontend estimates total from `worker_service.pricing.price_vnd` if present,
   otherwise `price`. This is display-only.
9. Client submits the booking payload.
10. Success toast tells client to wait for worker confirmation.

Frontend validation mirrors part of backend validation:

- Must select service, unit, date, and time.
- Quantity must be at least 1.
- Start time must be at least 2 hours from now.

Backend remains authoritative. The frontend disables only fully-booked days and
already-taken hour slots as a UX hint (shared logic in
`pr1as-client/lib/booking-availability.ts`), while backend validates exact time
overlap and blackouts. The four booking surfaces — `book-worker-dialog.tsx`,
`quick-booking-dialog.tsx`, `quick-booking-wizard.tsx`, and the profile
`worker-calendar.tsx` — all consume that shared module.

## Advance-Booking Rules

Runtime limits from `BOOKING_LIMITS`:

| Limit | Value | Meaning |
| --- | --- | --- |
| `MIN_ADVANCE_HOURS` | 2 | Booking start must be at least 2 hours from current time. |
| `MAX_ADVANCE_DAYS` | 30 | Booking start cannot be more than 30 days away. |
| `MIN_DURATION_HOURS` | 1 | Declared constant; current create validation derives duration from start/end. |
| `MAX_DURATION_HOURS` | 24 | Declared constant; not currently enforced in create schema. |
| `MAX_DURATION_DAYS` | 30 | Declared constant; not currently enforced in create schema. |
| `MAX_DURATION_MONTHS` | 12 | Declared constant; not currently enforced in create schema. |

Practical examples:

- Now 08:00, start 09:30: rejected because it is less than 2 hours away.
- Now 08:00, start 10:30: allowed by advance-time validation.
- Start 15 days from now: allowed by advance-time validation.
- Start 40 days from now: rejected because it exceeds 30 days.

## Worker Confirmation Deadline and Expiration

Pending bookings expire if the worker does not confirm in time.

Source:

- `SERVER/src/services/booking/booking-expiration.service.ts`
- `SERVER/src/jobs/booking-expiration.job.ts`

Limits:

| Limit | Value |
| --- | --- |
| `CONFIRM_DEADLINE_BEFORE_START_HOURS` | 6 hours |
| `SHORT_NOTICE_CONFIRM_MINUTES` | 60 minutes |
| Expiration job cron | Every 5 minutes |
| Expiration scan limit | 100 candidates per run |

Deadline calculation:

```text
beforeStartDeadline = schedule.start_time - 6 hours

if beforeStartDeadline <= booking.created_at:
  deadline = booking.created_at + 60 minutes
  reason = "short_notice_confirmation_timeout"
else:
  deadline = beforeStartDeadline
  reason = "confirmation_deadline_before_start"
```

Examples:

- Booking starts Wednesday 14:00 and was created before 08:00 that day:
  worker must confirm before Wednesday 08:00.
- Booking is created at 08:00 for a same-day 11:00 start:
  `start - 6h` is before creation time, so worker has 60 minutes, until 09:00.

Expiration side effects:

- Status becomes `expired`.
- `cancellation` is filled as:
  - `cancelled_by: system`
  - `reason: worker_unavailable`
  - `notes: "Worker did not confirm before the deadline"`
- Notification event `bookingAutoExpiredWarning` is emitted.
- Worker reputation is deducted using active config key
  `BOOKING_EXPIRY_DEDUCTION`, if that key is active.

Frontend displays a live countdown for pending bookings by mirroring the same
deadline calculation in:

- `pr1as-client/app/client/bookings/format.ts`
- `pr1as-client/app/worker/bookings/format.ts`
- `pr1as-client/components/booking/booking-countdown.tsx`

## Updating a Booking

Route: `PATCH /api/bookings/:id`

Accepted update fields:

```ts
{
  schedule?: { start_time, end_time },
  pricing?: { unit, quantity },
  client_notes?: string,
  worker_response?: string,
}
```

Rules:

- Only booking owner or admin can access the update route.
- Completed and cancelled bookings cannot be updated.
- Client-editable fields are `schedule`, `pricing`, `client_notes`.
- Client can edit those fields only while status is `pending`.
- If client changes schedule, backend checks schedule conflict again.
- Worker can update only `worker_response`.
- Admin can update `schedule`, `pricing`, `client_notes`, and
  `worker_response`.
- Admin update path whitelists editable fields and does not allow direct
  mutation of identities, status, or immutable timestamps.

Important nuance:

- Client updates are locked once a worker confirms. This prevents surprise
  reschedules or price/quantity changes after worker acceptance.
- Worker response update is available through the backend for any non-completed,
  non-cancelled booking; frontend currently exposes it mainly for pending,
  confirmed, and in-progress worker actions.

## Worker Actions

Worker booking page:

- Route: `pr1as-client/app/worker/bookings/page.tsx`
- Uses `role=worker` on `GET /api/bookings/my`.

Backend-authorized worker status actions:

| Current status | Worker action | Target status |
| --- | --- | --- |
| `pending` | Accept | `confirmed` |
| `pending` | Reject | `rejected` |
| `confirmed` | Start service | `in_progress` |
| `in_progress` | Mark done / send completion | `pending_client_acceptance` |

Worker can also:

- Add/update `worker_response`.
- Cancel a `pending` or `confirmed` booking through the cancel route.
- Open the complaint group when booking is `disputed`.

Backend does not allow unilateral cancellation from `in_progress`. Any issue
while service is already in progress should go through dispute.

## Client Actions

Client bookings page:

- Route: `pr1as-client/app/client/bookings/page.tsx`
- Uses `role=client` on `GET /api/bookings/my`.

Client actions:

| Current status | Client action | Result |
| --- | --- | --- |
| `pending` | Cancel | `cancelled`, no late-cancel reputation penalty. |
| `confirmed` | Cancel | `cancelled`, possible late-cancel reputation penalty. |
| `in_progress` | Dispute | `disputed`. |
| `pending_client_acceptance` | Confirm complete | `completed`. |
| `pending_client_acceptance` | Dispute | `disputed`. |
| `completed` | Review worker | Creates a review if none exists. |
| `completed` | Dispute within window | `disputed`. |
| `disputed` | Open complaint group chat | Navigates to group chat for the dispute. |

Client cannot complete the booking until worker has moved it to
`pending_client_acceptance`.

## Cancellation Rules

Route: `PATCH /api/bookings/:id/cancel`

Payload:

```ts
{
  reason: "client_request" | "worker_unavailable" | "schedule_conflict" |
          "emergency" | "policy_violation" | "other",
  notes?: string // max 500 chars
}
```

Allowed cancellation states:

- `pending`
- `confirmed`

Not cancellable through normal cancellation:

- `in_progress`
- `pending_client_acceptance`
- `completed`
- `cancelled`
- `rejected`
- `disputed`
- `expired`

Who can cancel:

- Booking client
- Booking worker
- Admin

`cancelled_by` mapping:

- Client participant -> `client`
- Worker participant -> `worker`
- Admin -> `admin`

Reputation effects:

| Situation | Reputation effect |
| --- | --- |
| Client cancels while booking is still `pending` | No deduction. |
| Client cancels a confirmed booking more than 24 hours before start | No deduction. |
| Client cancels a confirmed booking less than 24 hours before start | Deduct active `CLIENT_LATE_CANCEL_DEDUCTION`, if configured/active. |
| Worker cancels | Deduct active `WORKER_CANCEL_DEDUCTION`, if configured/active. |
| Admin cancels | No direct reputation deduction in booking status service. |
| System expires booking | Worker deduction through expiration service. |

Free-cancellation window:

- `BOOKING_LIMITS.CANCELLATION_FREE_HOURS = 24`
- The late-cancel deduction is applied only when the worker had already agreed,
  meaning original status was not `pending`.

No cancellation moves money. Booking has no escrow, refund, or payout.

Implementation note: the client and worker format helpers currently include
`in_progress` in some UI cancel checks, but the backend transition table rejects
`in_progress -> cancelled`. Treat backend as source of truth.

## Dispute Flow

Create dispute route: `POST /api/bookings/:id/dispute`

Resolve dispute route: `PATCH /api/bookings/:id/dispute/resolve`

Create-dispute payload:

```ts
{
  reason: "service_not_as_described" | "worker_no_show" | "poor_quality" |
          "incomplete_service" | "unprofessional_behavior" |
          "safety_concern" | "other",
  description: string,        // 10..2000 chars
  evidence_urls?: string[],   // max 10 URLs
}
```

Who can open a dispute:

- Booking client
- Booking worker

Allowed statuses for creating a dispute:

- `in_progress`
- `pending_client_acceptance`
- `completed`

Completed-booking dispute window:

- `BOOKING_LIMITS.DISPUTE_WINDOW_DAYS = 3`
- Window is counted from `schedule.end_time`.
- If status is already `completed` and now is more than 3 days after
  `schedule.end_time`, backend rejects the dispute.
- The 3-day window does not limit active `in_progress` or
  `pending_client_acceptance` disputes.

Other dispute rules:

- A booking can have only one dispute subdocument.
- Creating a dispute moves status to `disputed`.
- `disputed_at` is set both inside the dispute object and on the top-level
  booking field.
- Notification event `disputeCreated` is emitted.

Admin resolution:

```ts
{
  resolution: "favor_client" | "favor_worker",
  resolution_notes: string // 1..2000 chars
}
```

Resolution outcomes:

| Resolution | Final booking status | Extra fields |
| --- | --- | --- |
| `favor_worker` | `completed` | Sets `completed_at`. |
| `favor_client` | `cancelled` | Sets admin cancellation with `policy_violation` reason and notes. |

Only admin can resolve disputes. Resolution emits `disputeResolved`.

## Complaint Group Chat

Disputed bookings connect to complaint group chat. Frontend actions call
`useCreateComplaintConversation(bookingId)` and navigate to:

```text
/chat/group?group=<conversation_group_id>
```

Participants are expected to be client, worker, and admin-side handling. See
`memorybank/chat.md` for the complaint group chat details.

## Reviews After Completion

Reviews are in the review module but are part of the booking lifecycle.

Review rules from `SERVER/src/services/review/review.service.ts`:

- Only `client_to_worker` reviews are accepted.
- Booking must be `completed`.
- The reviewer must be the booking client.
- `worker_id` must match the booking worker.
- One review per booking, enforced by unique index on `booking_id`.
- Rating must be 1..5.
- Rating details cover professionalism, punctuality, communication, and service
  quality.
- Average of rating details must be within 1 point of the overall rating.
- Low review can deduct worker reputation using config keys
  `LOW_REVIEW_THRESHOLD` and `LOW_REVIEW_DEDUCTION`.

Frontend client bookings page shows review action for `completed` bookings.

## Notifications

Booking-related notification events include:

- Booking created
- Booking updated
- Booking status updated
- Booking cancelled
- Booking auto-expired warning
- Booking reminder
- Dispute created
- Dispute resolved
- Review created / review updated from review module

Reminder job:

- `SERVER/src/jobs/booking-reminder.job.ts`
- Runs every 10 minutes.
- Finds upcoming `confirmed` and `in_progress` bookings.
- Sends reminder events for bookings within 24 hours and within 1 hour.

## Reputation Integration

Booking and review events use `reputationConfigService` and
`reputationService`.

Reputation deductions:

| Event | Config key | Reason |
| --- | --- | --- |
| Pending booking expires | `BOOKING_EXPIRY_DEDUCTION` | `booking_expiry` |
| Worker cancels | `WORKER_CANCEL_DEDUCTION` | `worker_cancel` |
| Client late-cancels a confirmed booking | `CLIENT_LATE_CANCEL_DEDUCTION` | `client_late_cancel` |
| Low review after completion | `LOW_REVIEW_DEDUCTION` plus `LOW_REVIEW_THRESHOLD` | `low_review` |

Booking creation also rejects clients whose reputation score is below 30.
Worker profile booking UI disables booking workers whose displayed reputation is
below 30, but backend still performs its own checks for client score and worker
eligibility.

## API Surface

Routes under `/api/bookings`:

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/quickbook` | Public | Create a guest booking; CSRF + rate-limited (8/hour). |
| `GET` | `/lookup` | Public | Look up a guest booking by `public_ref` + `email`. |
| `POST` | `/` | Authenticated | Create booking; rate-limited. |
| `GET` | `/my` | Authenticated | List current user's bookings, role-aware. Accepts `is_guest` filter. |
| `GET` | `/admin/analytics` | Admin | Booking analytics. |
| `GET` | `/:id` | Authenticated | Booking detail for participant/admin. |
| `PATCH` | `/:id/status` | Authenticated | Status transition. |
| `PATCH` | `/:id/cancel` | Authenticated | Cancel with reason/metadata. |
| `PATCH` | `/:id` | Authenticated | Update schedule/pricing/notes/response. |
| `POST` | `/:id/dispute` | Authenticated | Open dispute. |
| `PATCH` | `/:id/dispute/resolve` | Admin required in service | Resolve dispute. |

`GET /api/bookings/my` query:

```ts
{
  role?: "client" | "worker",
  status?: BookingStatus,
  service_code?: string,
  search?: string,           // max 200 chars
  is_guest?: boolean,        // filter guest vs account bookings
  start_date?: Date,
  end_date?: Date,
  page?: number,
  limit?: number, // max 100
}
```

Role behavior:

- If `role=worker`, user must have worker role; results filter
  `worker_id=userId`.
- If `role=client`, user must have client role; results filter
  `client_id=userId`.
- If `role` is omitted, backend uses `lastActiveRole`.

Admin analytics query:

```ts
{
  start_date?: Date,
  end_date?: Date,
  recent_limit?: number // 1..50
}
```

Analytics output:

- Total bookings.
- Completed count/rate.
- Cancelled count/rate.
- Disputed count/rate.
- Status counts with percentages for all statuses.
- Created-by-date buckets.
- Completion-by-date buckets.
- Recent bookings.

## Money and Pricing Notes

Booking stores:

```ts
pricing: {
  unit: PricingUnit,
  quantity: number,
}
```

Booking does not store:

- Unit price
- Total amount
- Currency
- Wallet transaction id
- Escrow state
- Payout/refund state

Worker service stores actual displayed prices:

- `price`
- `currency`
- `exchange_rate`
- `price_vnd`

Frontend uses `price_vnd` to estimate the booking total in the dialog. This
estimate is not a booking payment and does not trigger wallet movement.

## Known Implementation Nuances

- `BOOKING_LIMITS` declares duration min/max values, but create validation
  currently enforces only `start_time < end_time`, advance window, and computed
  duration.
- Generic status cancellation can bypass cancellation metadata; use the cancel
  endpoint for product flows.
- Some frontend cancel action checks include `in_progress`, while backend
  rejects cancellation from `in_progress`.
- Dispute evidence URLs are supported by backend schema, but the current client
  dispute dialog submits reason and description only.
- Public booking pages intentionally do not display converted booking currency
  amounts as a transactional charge.

