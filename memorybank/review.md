# Memory Bank - Reviews

## Purpose

Reviews let clients rate workers after a completed booking. A review records an
overall rating, four category ratings, a written comment, optional worker reply,
and visibility/reporting counters. Low reviews can deduct worker reputation.

Primary source files:

- Constants: `SERVER/src/constants/review.ts`
- Model: `SERVER/src/models/review/review.model.ts`
- Types: `SERVER/src/types/review/review.types.ts`
- Validation: `SERVER/src/validations/review/review.validation.ts`
- Service: `SERVER/src/services/review/review.service.ts`
- Repository: `SERVER/src/repositories/review/review.repository.ts`
- Routes: `SERVER/src/routes/review/review.routes.ts`
- Controller: `SERVER/src/controllers/review/review.controller.ts`
- Frontend API/hook:
  - `pr1as-client/services/review.service.ts`
  - `pr1as-client/lib/hooks/use-reviews.ts`
- Booking review dialog:
  - `pr1as-client/app/client/bookings/components/review-booking-dialog.tsx`
- Worker profile reviews:
  - `pr1as-client/components/worker/worker-reviews.tsx`

## Review Model

Collection: `review`.

Fields:

| Field | Meaning |
| --- | --- |
| `booking_id` | Booking being reviewed. Unique index enforces one review per booking. |
| `client_id` | Reviewer/client. |
| `worker_id` | Reviewed worker. |
| `review_type` | Currently only `client_to_worker` is accepted by service. |
| `rating` | Overall rating, integer 1..5. |
| `rating_details.professionalism` | Category rating, 1..5. |
| `rating_details.punctuality` | Category rating, 1..5. |
| `rating_details.communication` | Category rating, 1..5. |
| `rating_details.service_quality` | Category rating, 1..5. |
| `comment` | Required review text, 10..1000 chars. |
| `is_visible` | Whether review is visible. Defaults to true. |
| `worker_reply` | Optional worker/admin reply, max 500 chars. |
| `worker_replied_at` | Reply timestamp. |
| `helpful_count` | Helpful counter. Defaults to 0. |
| `reported_count` | Report counter. Defaults to 0. |
| `created_at`, `updated_at` | Timestamps. |

Indexes:

- Unique `booking_id`
- `worker_id + is_visible + rating`
- `client_id + created_at`
- `review_type + status`
- `rating + is_visible`
- `worker_id + review_type + is_visible`

Important schema nuance:

- `ReviewStatus` exists in constants/types and repository filters use
  `status`, but `review.model.ts` does not currently define a `status` schema
  path. Do not assume review moderation status is persisted until the schema is
  updated.

## Review Limits

From `REVIEW_LIMITS`:

| Limit | Value |
| --- | ---: |
| `MIN_RATING` | 1 |
| `MAX_RATING` | 5 |
| `MIN_COMMENT_LENGTH` | 10 |
| `MAX_COMMENT_LENGTH` | 1000 |
| `MAX_REPLY_LENGTH` | 500 |
| `RATING_DETAILS_COUNT` | 4 |
| `RATING_DECIMAL_PLACES` | 1 |
| `RATING_ROUNDING_MULTIPLIER` | 10 |

Rating details are equally weighted in constants:

- professionalism: 0.25
- punctuality: 0.25
- communication: 0.25
- service quality: 0.25

Current create/update validation checks consistency by requiring the average of
the four rating details to be within 1 point of the overall rating.

## Create Review Flow

Route: `POST /api/reviews`

Middleware:

- `authenticate`

Payload:

```ts
{
  booking_id: ObjectId,
  worker_id: ObjectId,
  client_id: ObjectId,
  review_type: "client_to_worker",
  rating: number,
  rating_details: {
    professionalism: number,
    punctuality: number,
    communication: number,
    service_quality: number,
  },
  comment: string,
}
```

Validation:

- Object ids must be valid.
- `review_type` must be enum-valid.
- Rating and all details must be integer 1..5.
- Comment length must be 10..1000 chars.
- Average rating details must be within 1 point of `rating`.

Service rules:

1. Booking must exist.
2. `review_type` must be `client_to_worker`.
3. Booking status must be `completed`.
4. Authenticated user must be the booking client.
5. Payload `worker_id` must match booking worker.
6. Only one review per booking.
7. Service overwrites `client_id` with the authenticated user id and
   `worker_id` with the booking worker id.
8. Repository creates review with:
   - `is_visible: true`
   - `helpful_count: 0`
   - `reported_count: 0`
9. Notification event `reviewCreated` is queued asynchronously.
10. Low-review reputation deduction is evaluated asynchronously.

Frontend flow:

- Client bookings page shows review action for `completed` bookings.
- `ReviewBookingDialog` collects four category ratings.
- Frontend computes overall rating by rounding the category average.
- Frontend submits `client_to_worker` review with booking id, worker id, current
  user id, details, rating, and comment.

## Low Review Reputation Deduction

Source: `reviewService.createReview`.

Flow:

1. Load `LOW_REVIEW_THRESHOLD` via `getValue`.
2. Load active `LOW_REVIEW_DEDUCTION` via `getActiveValue`.
3. If deduction is active and `rating <= threshold`, deduct worker reputation.
4. History reason: `low_review`.

This runs asynchronously after review creation. A reputation error is logged and
does not roll back the review.

## Read and List Rules

### Get Review By Id

Route: `GET /api/reviews/:id`

Access:

- Admin can read.
- Review worker can read.
- Review client can read.
- Other users can read only if `is_visible` is true.

Service uses role info from `userRepository.getUserRoleInfoById`.

### My Reviews

Route: `GET /api/reviews/my`

Behavior:

- If user is worker, returns reviews by `worker_id=userId`.
- Else if user is client, returns reviews by `client_id=userId`.
- Else forbidden.

Query filters:

```ts
{
  worker_id?: string,
  client_id?: string,
  booking_id?: string,
  review_type?: ReviewType,
  status?: ReviewStatus,
  min_rating?: number,
  max_rating?: number,
  is_visible?: boolean,
  page?: number,
  limit?: number,
}
```

Nuance:

- `getMyReviews` chooses worker first if the account has worker role, even if it
  also has client role. It does not inspect `last_active_role`.
- Frontend `review.service.ts` currently passes only booking/worker/client/type
  and status filters; min/max/is_visible are backend-supported but not wired in
  that client helper.

### Admin List

Route: `GET /api/reviews/all`

Middleware:

- `authenticate`
- `adminOnly`

Returns paginated reviews with filters.

## Update, Delete, Reply

### Update Review

Route: `PATCH /api/reviews/:id`

Payload:

```ts
{
  rating?: number,
  rating_details?: ReviewRatingDetails,
  comment?: string,
}
```

Rules:

- At least one field is required.
- Rating/detail validation matches create validation.
- Owner client or admin can update.
- Service rejects update when `review.status === approved`.

Nuance:

- Because the Mongoose schema currently does not define `status`, the approved
  guard may not be effective for newly created reviews unless legacy documents
  carry that path.

### Delete Review

Route: `DELETE /api/reviews/:id`

Rules:

- Owner client or admin can delete.
- Delete is a hard delete via `findByIdAndDelete`.
- There is no soft-delete or visibility toggle in the delete service.

### Worker Reply

Route: `POST /api/reviews/:id/reply`

Payload:

```ts
{
  reply: string // 1..500 chars
}
```

Rules:

- Worker who owns the review can reply.
- Admin can also reply.
- Review type must be `client_to_worker`.
- Reply overwrites `worker_reply` and sets `worker_replied_at` to now.

## Stats

Route: `GET /api/reviews/stats/:workerId`

Middleware:

- `authenticate`

Access:

- Admin can request any worker stats.
- Worker can request only their own stats.
- Other users are forbidden.

Repository aggregation:

- Loads visible reviews for the worker.
- Returns:
  - `total_reviews`
  - `average_rating`, rounded to one decimal
  - distribution for ratings 1..5
  - average category ratings

If there are no reviews:

- Total = 0
- Average = 0
- Distribution all zero
- Category averages all zero

Note: older docs may imply this endpoint is public; current route requires
authentication and access checks.

## Frontend Surfaces

Client booking review:

- Page: `/client/bookings`
- Component: `ReviewBookingDialog`
- Hook: `useCreateReview`
- Success invalidates review and booking query keys.

Worker profile reviews:

- Component: `WorkerReviews`
- Displays reviewer avatar/name, stars, date, comment, and optional worker
  reply.
- Uses `getPlanRingClass` to show reviewer plan styling around avatar.

Frontend review service currently exposes:

- `getMyReviews`
- `createReview`

It does not expose update/delete/reply/stats helpers even though backend routes
exist.

## API Surface

Routes under `/api/reviews`:

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/` | Authenticated | Create client-to-worker review. |
| `GET` | `/my` | Authenticated | Current user's reviews as worker or client. |
| `GET` | `/all` | Admin | Admin review list. |
| `GET` | `/stats/:workerId` | Authenticated | Worker stats for admin or that worker. |
| `GET` | `/:id` | Authenticated | Review detail with visibility/owner access. |
| `PATCH` | `/:id` | Authenticated | Update review by owner/admin. |
| `DELETE` | `/:id` | Authenticated | Hard delete review by owner/admin. |
| `POST` | `/:id/reply` | Authenticated | Worker/admin reply. |

## Common Implementation Checklist

When changing reviews:

1. Keep booking completion and participant checks in the service, not only UI.
2. Preserve unique one-review-per-booking behavior unless product changes it.
3. If enabling review moderation statuses, add `status` to the Mongoose schema
   and update create/update/admin flows.
4. Keep low-review reputation deduction async unless product needs strict
   transaction coupling.
5. Expose frontend service methods when adding UI for update/delete/reply/stats.
6. Re-check access rules for multi-role users because `getMyReviews` currently
   prefers worker role.

## Known Implementation Nuances

- `ReviewStatus` is present in constants/types but absent from the Mongoose
  schema.
- Backend supports update/delete/reply/stats routes, but frontend service only
  wraps create and my-list.
- Stats endpoint is authenticated and restricted, not public.
- Create payload includes `client_id`, but service ignores it in favor of the
  authenticated user id.
- Delete is hard delete, not `is_visible=false`.

