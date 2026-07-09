# Service Lifecycle, Admin Management & Worker Profile Integrity — Design Spec

**Date:** 2026-07-08
**Status:** Approved (design phase)
**Author:** brainstorming session

## Problem

Services are DB-backed (`Service` model) but seeded from a hardcoded catalog
([SERVER/src/constants/service-catalog.ts](../../../SERVER/src/constants/service-catalog.ts)),
with **no admin CRUD** today (only `GET` routes). Once admins can add/remove
services continuously, two failure modes threaten worker-profile integrity:

1. **Removing a service** — hard-deleting a service that workers offer would
   orphan their `WorkerService` offerings (losing pricing config) and break
   historical bookings, which store `service_id`/`service_code` but do **not**
   snapshot the service name. Workers would silently vanish from filters.
2. **Adding a service** — a brand-new service has no existing offerings, so old
   workers won't appear when clients filter by it. Pricing is worker-specific
   and cannot be auto-generated, so re-inclusion must be opt-in.

The user is **not** concerned with editing/renaming/merging services (rename is
safe: offerings reference by stable `code`/`id`, localized name lives on the
`Service` doc and propagates automatically).

## Goals

- Give admins a **service management page** to create, edit, deprecate,
  reactivate, and (safely) delete services.
- Never lose worker offering/pricing data or break historical bookings.
- Keep worker discovery filters correct as the catalog changes.
- Bring existing workers into new services via a **reasonable, non-spammy**
  opt-in flow.

## Chosen Approach — Reuse `is_active` as deprecation flag (Approach A)

No new state machine. `is_active=false` means "deprecated/stopped". Filters and
discovery already exclude `is_active=false`. Add admin CRUD, a hard-delete
guardrail, and a two-tier notification strategy. Rejected alternatives: an
explicit `status` enum (more migration for unused semantics) and immutable
service versioning (overkill — pricing/history live on worker/booking, not
service).

## Current Architecture (verified)

- **`Service`** — [SERVER/src/models/service/service.ts](../../../SERVER/src/models/service/service.ts):
  `code` (unique, uppercase), `category`, `icon`, localized `name`/`description`,
  `companionship_level`, `rules`, `is_active` (default `true`, indexed),
  `created_at`, `updated_at`.
- **`WorkerService`** — [SERVER/src/models/worker/worker-service.ts](../../../SERVER/src/models/worker/worker-service.ts):
  `worker_id`, `service_id` (ref), `service_code` (denormalized), `pricing[]`,
  `is_active`. Reference survives deprecation because both id and code are stored.
- **`Booking`** — [SERVER/src/models/booking/booking.model.ts](../../../SERVER/src/models/booking/booking.model.ts):
  stores `worker_service_id`, `service_id`, `service_code`, pricing snapshot.
  **Does not snapshot the localized service name** — resolves it from `Service`
  at display time. This is why hard-delete must be blocked when bookings exist.
- **Service filter** — [SERVER/src/services/service/service.service.ts](../../../SERVER/src/services/service/service.service.ts)
  `searchServices` defaults `is_active=true`; deprecated services already hidden.
- **Worker discovery** — [SERVER/src/services/worker/worker.service.ts](../../../SERVER/src/services/worker/worker.service.ts)
  + `worker-service.repository.ts` (`findWorkersGroupedByService`). Must be
  audited to confirm it excludes `is_active=false` services.
- **Notifications** — `notificationService.notify(input: NotifyInput)`
  ([SERVER/src/services/notification/notification.service.ts](../../../SERVER/src/services/notification/notification.service.ts))
  accepts `recipient_ids: string[]`, filters inactive recipients, resolves
  channels against each user's preferences, and dedupes on `dedupe_key`.
  `NotificationType` enum in [SERVER/src/constants/notification.ts](../../../SERVER/src/constants/notification.ts).
- **Routes** — public `GET /services`; admin routes follow the `/admin/<domain>`
  pattern (e.g. `/admin/boost`, `/admin/reputation-config`), mounted in
  [SERVER/src/routes/index.ts](../../../SERVER/src/routes/index.ts).

## Design

### 1. Data model changes

**`Service` model — add three fields, change nothing existing:**

- `deprecated_at: Date | null` — default `null`. Set to now on deprecate,
  cleared to `null` on reactivate. Audit + ordering.
- `created_by: ObjectId | null` — ref `USER`, default `null`. Admin who created.
- `updated_by: ObjectId | null` — ref `USER`, default `null`. Last admin editor.

`is_active` keeps its single meaning: `false` ⇔ deprecated/stopped.

**`WorkerService`** — no schema change. **`Booking`** — no change in this scope.

### 2. Admin service management (backend)

New route group `/admin/services` (`authenticate` + `adminOnly` +
`csrfProtection`), full layered stack routes → controller → service →
repository, Zod validation in `validations/service/`:

| Endpoint | Behavior |
|---|---|
| `GET /admin/services` | List **all** services incl. deprecated (admin view; unlike public `GET /services` which hides `is_active=false`). Supports `category` + `is_active` filters. |
| `POST /admin/services` | Create. Validates `code` unique + uppercase, `name.vi`+`name.en` required, `category` in enum, `icon`, optional `description`/`rules`/`companionship_level`. Sets `created_by`. Triggers "new service" notify (§5). |
| `PATCH /admin/services/:id` | Update `name`/`description`/`icon`/`category`/`rules`/`companionship_level`. **`code` is immutable** (reference key) — reject if present/changed. Sets `updated_by`. |
| `POST /admin/services/:id/deprecate` | Set `is_active=false`, `deprecated_at=now`, `updated_by`. Triggers deprecate notify (§4). No-op (idempotent) if already deprecated. |
| `POST /admin/services/:id/reactivate` | Set `is_active=true`, `deprecated_at=null`, `updated_by`. |
| `DELETE /admin/services/:id` | Hard delete, **guarded** (§3). |

### 3. Hard-delete guardrail

`DELETE /admin/services/:id` succeeds only when **both** reference counts are
zero:

- No `WorkerService` references this `service_id` (any `is_active` state).
- No `Booking` references this `service_id`.

Otherwise respond **`409 Conflict`** via the `R` helper with a message telling
the admin to Deprecate instead, plus the counts
(`{ worker_count, booking_count }`). This makes hard-delete real (a genuinely
unused service can be removed) while preventing data loss. The admin UI surfaces
this as a clear, non-fatal error and points to the Deprecate action.

### 4. Deprecate behavior + notification

- Deprecated service disappears from worker setup lists and public discovery
  filters — already enforced by `is_active=true` defaults in `searchServices`
  and discovery queries. **Audit** every service-listing query path (public
  service list, worker discovery grouped-by-service) to confirm it filters
  `is_active`; fix any that don't.
- `WorkerService` offerings are **left untouched** — historical data and past
  bookings keep resolving the service.
- **Notify** every worker who offers the service. Recipients = distinct
  `worker_id` from `WorkerService` where `service_id` matches (include
  `is_active=false` offerings so paused workers are informed too).
  - Type: new `NotificationType.SERVICE_DEPRECATED`.
  - Channels: **IN_APP + EMAIL** (targeted, low-volume, actionable — the worker
    needs to know their offering stopped receiving new bookings).
  - `dedupe_key = service_deprecated:<serviceId>` to prevent duplicate sends.
  - Body: the service no longer accepts new bookings; existing bookings are
    unaffected.

### 5. New service → opt-in (two tiers, non-spammy)

**Tier 1 — Banner (primary, pull-based):** a "new services available" banner on
the worker profile-setup page, computed client-side as `active services the
worker does not yet offer`. Creates no notification rows, always accurate,
never spams. Clicking routes into the **existing** add-service + set-pricing
flow. Hides automatically once the worker offers every active service.

**Tier 2 — One in-app nudge per new service (push-based, light):** on
`POST /admin/services`, notify **all active workers**.

- Type: new `NotificationType.SERVICE_ADDED`.
- Channels: **IN_APP only — no EMAIL, no PUSH** (avoid blasting every worker's
  inbox for every service).
- `dedupe_key = service_added:<serviceId>` so re-runs never duplicate.
- Recipients: distinct active `WORKER` user ids. `notify` already filters
  inactive recipients and respects per-user preferences.
- **Implementation note:** this fans out to potentially many workers. Build the
  recipient list from a lean projection (worker user ids only) and pass the full
  array to `notify` in one call; IN_APP delivery is a DB row + socket emit per
  recipient. Keep it a single service-layer call, dispatched async as the
  existing `notify` already does — no synchronous blocking of the admin request.

A worker only appears in a new service's discovery filter **after** they add it
and set pricing. This is correct: pricing is worker-controlled, never
auto-generated.

### 6. Notification type additions

Add to `NotificationType` ([SERVER/src/constants/notification.ts](../../../SERVER/src/constants/notification.ts)):

- `SERVICE_DEPRECATED = "service.deprecated"`
- `SERVICE_ADDED = "service.added"`

Add matching entries to `NOTIFICATION_TYPE_CONFIG`:

- `SERVICE_DEPRECATED`: category `SYSTEM` (or `ADMIN`), priority normal,
  channels `[IN_APP, EMAIL]`.
- `SERVICE_ADDED`: category `SYSTEM`, priority normal, channels `[IN_APP]`.

Add localized notification copy (title/body) to all four locale message files
(`vi`, `en`, `zh`, `ko`) if the client localizes notification strings.

### 7. Frontend

- **Admin dashboard — service management screen:** list all services (incl.
  deprecated, with a status badge), create/edit forms (localized name/desc
  inputs, category, icon, rules), deprecate/reactivate toggles, and delete with
  the §3 409 guardrail surfaced as a clear error that points to Deprecate.
  Follows existing admin CRUD patterns; new hooks in `lib/hooks/use-*.ts`,
  query keys in `lib/query-keys.ts`, axios client in
  `services/admin-service.service.ts` (or extend existing service client).
- **Worker setup — "new services available" banner:** §5 Tier 1, entering the
  existing add-service flow.
- Mirror any new service-shape fields (`deprecated_at`) in
  `pr1as-client/services/*.service.ts` and `types/`.

## Edge Cases

- **Deprecate a service a worker offers, then reactivate** — offering was never
  removed, so it reappears intact. No migration needed.
- **Delete attempt on in-use service** — blocked with 409; admin uses deprecate.
- **New service, worker ignores banner + nudge** — simply never appears under
  it. Acceptable.
- **Admin adds several services quickly** — one in-app nudge per service (each
  dedupe-keyed); the banner aggregates them into a single persistent prompt, so
  perceived spam stays low.
- **Rename service** (supported, not primary scope) — propagates via reference;
  historical bookings show the current name (acceptable).
- **Notify with zero eligible recipients** — `notify` already returns `[]` for
  empty/inactive recipient lists; no special handling.

## Testing

**Backend (jest / ts-jest, service + repository layers):**

- `create` sets `created_by` and calls `notify` with `SERVICE_ADDED`, channel
  `[IN_APP]`, to all active worker ids, with `dedupe_key=service_added:<id>`.
- `update` rejects any attempt to change `code`; sets `updated_by`.
- `deprecate` sets `is_active=false` + `deprecated_at`, and calls `notify` with
  `SERVICE_DEPRECATED`, channels `[IN_APP, EMAIL]`, to exactly the worker ids
  that offer the service.
- `deprecate` is idempotent when already deprecated.
- `reactivate` restores `is_active=true`, `deprecated_at=null`.
- `delete` returns 409 when a `WorkerService` OR a `Booking` references the
  service (with correct counts); succeeds (removes the doc) when both are zero.
- Public service list and worker discovery exclude `is_active=false` services.

**Frontend:**

- "New services available" banner shows only services the worker does not yet
  offer, and hides once all active services are offered.
- Admin delete surfaces the 409 guardrail message and Deprecate hint.

## Out of Scope

- Booking-time snapshot of the localized service name (noted as the reason for
  the delete guardrail; not implemented here).
- Service merge/split/versioning.
- Category-scoped notification targeting or periodic digest (chosen: banner +
  one in-app nudge per new service to all active workers).
