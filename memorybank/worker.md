# Memory Bank - Worker Module

## Purpose

The worker module covers worker identity, worker profile, service offerings,
pricing rows, discovery/search, favorites, suggestions, public schedule, and
worker blackouts.

It does not own booking status changes or reviews, but it consumes booking and
review data heavily:

- discovery schedule filter uses booking conflicts,
- worker schedule exposes booking ranges,
- suggestions use review stats and completed bookings,
- worker profile includes reviews and active services.

Primary source files:

- Worker routes: `SERVER/src/routes/worker/worker.routes.ts`
- Worker service routes: `SERVER/src/routes/worker/worker-service.routes.ts`
- Worker controller: `SERVER/src/controllers/worker/worker.controller.ts`
- Worker-service controller:
  `SERVER/src/controllers/worker/worker-service.controller.ts`
- Worker domain service: `SERVER/src/services/worker/worker.service.ts`
- Worker service-offering service:
  `SERVER/src/services/worker/worker-service.service.ts`
- Worker service repository:
  `SERVER/src/repositories/worker/worker-service.repository.ts`
- Worker service model: `SERVER/src/models/worker/worker-service.ts`
- Favorites model: `SERVER/src/models/worker/worker-favorite.model.ts`
- Blackout model: `SERVER/src/models/worker/worker-blackout.model.ts`
- Worker profile validation: `SERVER/src/validations/user/user.validation.ts`
- Worker service validation:
  `SERVER/src/validations/worker/worker-service.validation.ts`
- Discovery query validation:
  `SERVER/src/validations/worker/worker-grouped-query.validation.ts`
- Blackout validation:
  `SERVER/src/validations/worker/worker-blackout.validation.ts`
- Frontend setup: `pr1as-client/app/worker/setup/page.tsx`
- Frontend worker detail: `pr1as-client/app/worker/[id]/page.tsx`
- Frontend schedule: `pr1as-client/app/worker/schedule/page.tsx`
- Frontend components: `pr1as-client/components/worker/*`
- Frontend service/hook: `pr1as-client/services/worker.service.ts`,
  `pr1as-client/lib/hooks/use-worker.ts`

## Worker Identity

A worker is a user with:

- `roles` containing `worker`.
- usually `last_active_role = worker` when using worker UI.
- a non-null `worker_profile`.
- at least one active `WorkerService` row to appear in discovery.

Worker profile lives on `user.worker_profile`:

| Field | Meaning |
| --- | --- |
| `date_of_birth` | Optional date. |
| `gender` | `MALE`, `FEMALE`, or `OTHER`. |
| `height_cm`, `weight_kg` | Optional positive numbers. |
| `star_sign`, `lifestyle`, `quote`, `introduction`, `title` | Profile copy. |
| `hobbies` | Array, max 30. |
| `gallery_urls` | Array, max 20. |
| `experience` | Experience enum. |
| `work_locations` | Up to 5 service areas with province/ward/snapshot label. |

Coordinates:

- Validation accepts `coords` inside `worker_profile` payload.
- Service splits it out and stores it at root `user.coords`.
- Discovery by lat/lng reads root `worker.coords`.

## Become Worker and Profile Update

`POST /api/auth/become-worker`:

1. Requires authenticated user.
2. Validates `worker_profile` and `confirm: true`.
3. Adds worker role if missing.
4. Sets `last_active_role = worker`.
5. Stores `coords` root-level.
6. Logs audit event.

`PATCH /api/auth/profile`:

1. Requires authenticated user.
2. Requires user already has worker role.
3. Updates allowed worker profile fields.
4. Stores `coords` root-level if provided.

The worker setup page also creates/updates worker services through
`/api/worker/services`.

## WorkerService Model

Collection: `worker_service`.

Fields:

| Field | Meaning |
| --- | --- |
| `worker_id` | User id of worker. |
| `service_id` | Catalog service id. |
| `service_code` | Snapshot service code, uppercase. |
| `pricing` | Non-empty pricing rows. |
| `is_active` | Whether this offering is active. |
| `created_at`, `updated_at` | Manual timestamps. |

Pricing row:

| Field | Meaning |
| --- | --- |
| `unit` | `HOURLY`, `DAILY`, or `MONTHLY`. |
| `duration` | Integer duration, >= 1. In current booking/search UI it is treated as the selectable quantity/duration value. |
| `price` | Raw price in the stored `currency`. |
| `currency` | Price currency, defaults to `VND`. |
| `exchange_rate` | Snapshot VND rate when saved. |
| `price_vnd` | Canonical normalized VND price used for sorting/comparison/display. |

Important: use `is_active`, not `active`.

## Worker Service Routes

Mounted under `/api/worker/services`. All routes require `authenticate`.
The service layer also checks the user has worker role.

| Method | Route | CSRF | Purpose |
| --- | --- | --- | --- |
| `GET` | `/` | No | List current worker's service offerings. |
| `POST` | `/` | Yes | Create/upsert multiple worker services. |
| `PATCH` | `/:serviceId` | Yes | Update pricing and/or `is_active` for one service. |
| `DELETE` | `/:serviceId` | Yes | Delete one worker service. |

Create payload:

```ts
{
  services: [
    {
      service_id: string,
      pricing: [
        { unit, duration, price, currency? }
      ]
    }
  ]
}
```

Rules:

- `services` min 1, max 20.
- `service_id` must be a valid ObjectId.
- Duplicate service ids are rejected.
- Services must exist and be active catalog services.
- Pricing must be non-empty.
- Duplicate pricing for same `unit + duration` is rejected.
- Currency must be supported if supplied.
- Backend computes `exchange_rate` and `price_vnd`.
- Create uses bulk upsert by `worker_id + service_id` and sets
  `is_active: true`.

Update payload:

```ts
{
  pricing?: WorkerServicePricingInput[],
  is_active?: boolean
}
```

At least one of `pricing` or `is_active` must be present.

## Public Worker Routes

Mounted under `/api/workers`.

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/location-suggestions` | No | Search location suggestions. |
| `GET` | `/grouped-by-service` | Optional | Discovery grouped by service. |
| `GET` | `/favorite-ids` | Client | Current client favorite worker ids. |
| `GET` | `/favorites` | Client | Current client favorite worker cards. |
| `POST` | `/:id/favorite` | Client | Favorite a worker. |
| `DELETE` | `/:id/favorite` | Client | Remove favorite. |
| `GET` | `/me/blackouts` | Worker | List current worker blackouts. |
| `POST` | `/me/blackouts` | Worker + CSRF | Create blackout. |
| `DELETE` | `/me/blackouts/:id` | Worker + CSRF | Delete blackout. |
| `GET` | `/:id/suggestions` | No | Similar worker suggestions. |
| `GET` | `/:id/schedule` | No | Public worker schedule. |
| `GET` | `/:id` | Optional | Public worker detail. |

## Worker Detail

`GET /api/workers/:id`:

1. If viewer has profile-blocked the worker, return not found.
2. Assert worker has no active `WORKER_ACTIVITY` restriction.
3. Load user.
4. Require `worker_profile`.
5. Load all worker services.
6. Load review stats.
7. Load visible `CLIENT_TO_WORKER` reviews.
8. Return profile, service pricing, review stats and review items.

Worker service rows in detail include inactive rows too, because
`findAllForWorker` is used. The frontend should decide how to show inactive
items.

## Discovery - Grouped by Service

`GET /api/workers/grouped-by-service` accepts:

| Query | Rule |
| --- | --- |
| `location` | Optional `lat,lng`, validated bounds. |
| `province_code` | Optional positive integer. |
| `ward_code` | Optional positive integer. |
| `schedule` | Optional ISO datetime with timezone. |
| `category` | Optional comma-separated category/service codes. |

Repository base query:

1. Match active worker service rows: `is_active: true`.
2. Exclude worker ids from profile blocks and active worker restrictions.
   The viewer themself is **not** excluded — a worker sees their own service
   listed alongside others on both home and `/services`.
3. Join catalog service and require `service.is_active: true`.
4. Join worker user and require `worker.status = active`.
5. Require `worker.worker_profile != null`.

Category filter:

- Values matching `ServiceCategory` filter `service.category`.
- Other values filter `service.code` or `worker_service.service_code`.

Location filter:

- `location=lat,lng` does a bounding-box search around worker root `coords`.
- Radius constant is 30 km.

Work-location filter:

- Uses `worker.worker_profile.work_locations`.
- A worker matches if they serve the province.
- If ward is provided, province-wide rows (`ward_code: null` or missing) and
  exact ward rows both match.

Sort and grouping:

- Workers with `reputation_score < 30` are pushed back.
- Higher reputation sorts first before grouping.
- Results are grouped by `service_id`.
- Groups sort by service code.

Boost integration:

1. Fetch active boosts for all discovered worker ids.
2. Fetch boost config.
3. Attach `boost.is_boosted`, `boost_type`, `boost_tier`.
4. Sort workers by boost tier first.
5. Workers with the same tier rotate using a deterministic scatter based on
   worker id and `rotation_interval_minutes`.

Schedule filter:

If `schedule` is absent, discovery returns grouped results after boost sorting.

If `schedule` is present:

1. Build a duration list per worker from each worker's pricing rows.
2. Compute the maximum end time across all worker durations.
3. Fetch booking conflicts for all workers in one query.
4. Keep workers where at least one duration does not overlap a conflict.
5. Drop groups with no available workers.

## Favorites

Model: `client_favorite_worker`.

Fields:

| Field | Meaning |
| --- | --- |
| `client_id` | Client user. |
| `worker_id` | Favorited worker. |
| `created_at` | Favorite timestamp. |

Indexes:

- Unique `{ client_id, worker_id }`.
- `{ client_id, created_at: -1 }`.

Rules:

- Only client role can use favorite routes.
- A client cannot favorite themself.
- Worker must exist, be active, and have a worker profile.
- Favorite list excludes inactive/restricted/profile-less workers.
- Favorite cards include active worker services and service catalog data.

## Worker Suggestions

`GET /api/workers/:id/suggestions`:

1. Validate current worker exists and has worker profile.
2. Load current worker active services.
3. Find candidate workers offering at least one matching service.
4. Candidate must be active and have worker profile.
5. Load review summary and completed booking count.
6. Score candidates using:
   - service match count,
   - rating,
   - completed bookings,
   - price proximity.

Price comparison uses normalized VND:

- `price_vnd` when present and positive,
- otherwise fallback to raw `price`.

This is important when workers price in different currencies.

## Schedule and Blackouts

Public schedule: `GET /api/workers/:id/schedule`.

Default range:

- `start_date` query if present, otherwise first day of current month.
- `end_date` query if present, otherwise one month after start date.

Returns:

```ts
{
  bookings: [
    { booking_id, start_time, end_time, status }
  ],
  blackouts: [
    { blackout_id, start_time, end_time, reason }
  ]
}
```

Bookings come from booking repository schedule query. Blackouts come from
`worker_blackout`.

Blackout model:

| Field | Meaning |
| --- | --- |
| `worker_id` | Worker user id. |
| `start_time`, `end_time` | Blocked time range. |
| `reason` | Optional reason, max 500. |
| `created_at` | Timestamp. |

Blackout route rules:

- Only workers can manage their blackouts.
- `end_time` must be after `start_time`.
- Creating a blackout is rejected if it overlaps existing booking conflicts.
- Worker must cancel/reschedule existing bookings before marking time off.

## Frontend Surfaces

Worker setup:

- `pr1as-client/app/worker/setup/page.tsx`
- Gets service catalog.
- Edits worker profile and worker services.
- Handles multi-currency price input.
- Preserves original price/currency when unchanged to avoid VND round-trip
  drift.

Worker detail:

- `pr1as-client/app/worker/[id]/page.tsx`
- `components/worker/worker-profile-header.tsx`
- `components/worker/worker-services.tsx`
- `components/worker/worker-reviews.tsx`
- `components/worker/book-worker-dialog.tsx`
- `components/worker/worker-calendar.tsx`

Discovery:

- `components/home/home-search-experience.tsx`
- `components/worker/workers-by-service-list.tsx`
- Calls `/api/workers/grouped-by-service`.
- `app/services/page.tsx` renders the same `HomeSearchExperience` component,
  so home and `/services` share one data source and one set of discovery
  filters — there is no separate "services page" query path.

Worker card (`WorkerCard` inside `workers-by-service-list.tsx`) shows
`height_cm`, `weight_kg` (from `worker_profile`) and `reputation_score`
(from `user.meta_data.reputation_score`, default 100) inline. These three
fields are projected explicitly in the `$group` stage of
`findWorkersGroupedByService` (`worker-service.repository.ts`) — they are
not part of the base aggregation pipeline and must stay in sync with the
return-type interfaces on that method and the frontend
`WorkerGroupedByService` type (`services/worker.service.ts`) if extended
further.

Expand-on-interaction pattern for the card:

- Desktop: wrapped in `HoverCard` (`components/ui/hover-card.tsx`); hovering
  reveals a floating panel with the untruncated bio/location/stats. Radix
  ignores `pointerType === "touch"`, so this never fires on mobile taps.
- Mobile: a manual long-press (~450ms, via `onTouchStart`/`onTouchMove`/
  `onTouchEnd` on the card's `Link`) opens a `BottomSheet`
  (`components/ui/bottom-sheet.tsx`) with the same expanded content. The
  bottom sheet's drag handle now supports drag-to-dismiss (pointer-based,
  threshold ~120px) — this was added to the shared component, so it also
  benefits every other `BottomSheet` usage in the app (mobile more/prefs
  menus, booking action sheet, mobile filters).

Worker schedule and bookings:

- `pr1as-client/app/worker/schedule/page.tsx`
- `pr1as-client/app/worker/bookings/schedule/page.tsx`

## Cross-Module Integrations

| Module | Integration |
| --- | --- |
| Auth | Worker role/profile and `last_active_role`. |
| Services | Worker offerings must point to active service catalog rows. |
| Booking | Schedule conflict checks and worker schedule output. |
| Review | Worker detail and suggestions use review stats/reviews. |
| Reputation | Discovery pushes low-reputation workers back. |
| Boost | Discovery boost tier sorting and rotation. |
| Worker Q&A | Profile page hosts the "Ask the worker" thread. See [worker-question.md](./worker-question.md). |
| Moderation | Profile blocks and `WORKER_ACTIVITY` restrictions hide/lock workers. |
| Multi-currency | Worker pricing stores `currency`, `exchange_rate`, `price_vnd`. |

## Common Implementation Checklist

When changing worker behavior:

1. Check whether the change belongs to user profile or worker service rows.
2. Preserve root-level `coords` handling.
3. Use `is_active` for worker service rows.
4. Recompute `exchange_rate` and `price_vnd` server-side for pricing.
5. Avoid client-trusting raw `price` for sorting across currencies.
6. Keep discovery filters aligned with moderation and boost.
7. Check schedule conflicts against booking repository before allowing
   blackout creation.
8. Update frontend service types and `types/index.ts`.

## Known Implementation Nuances

- Discovery schedule durations come from pricing `duration`; check whether a
  future booking UI interprets this as minutes, hours, or unit quantity before
  changing it.
- `getWorkerById` asserts no active worker restriction for the target worker.
  This can make an otherwise valid worker profile inaccessible.
- Favorite add currently checks active/profile status but not active restriction
  at add time; favorite list filters restricted workers later.
- Worker service deletion physically deletes the offering row.
- Admin-created worker edit replaces all services; worker setup upserts rows.
