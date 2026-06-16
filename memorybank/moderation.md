# Memory Bank - Moderation and User Safety

## Purpose

The moderation module handles user blocks, post/worker reports, admin report
review, feature restrictions, admin post deletion, and moderation-related
notifications.

It is split into three concepts:

- Block: user-to-user relationship that can block chat and optionally profile
  visibility.
- Report: user-submitted complaint about a post or worker.
- Restriction: admin-applied feature lock that actively affects product
  behavior.

Primary source files:

- Routes: `SERVER/src/routes/moderation/moderation.routes.ts`
- Controller: `SERVER/src/controllers/moderation/moderation.controller.ts`
- Service: `SERVER/src/services/moderation/moderation.service.ts`
- Repository: `SERVER/src/repositories/moderation/moderation.repository.ts`
- Models:
  `SERVER/src/models/moderation/user-block.model.ts`,
  `SERVER/src/models/moderation/report.model.ts`,
  `SERVER/src/models/moderation/user-restriction.model.ts`
- Constants: `SERVER/src/constants/moderation.ts`
- Validation: `SERVER/src/validations/moderation/moderation.validation.ts`
- Deferred notify job: `SERVER/src/jobs/moderation-resolution-notify.job.ts`
- Frontend service/hook:
  `pr1as-client/services/moderation.service.ts`,
  `pr1as-client/lib/hooks/use-moderation.ts`
- Frontend pages/components:
  `pr1as-client/app/dashboard/reports/page.tsx`,
  `pr1as-client/app/client/blocked/page.tsx`,
  `pr1as-client/components/worker/worker-report-button.tsx`

## Constants

Report target types:

- `post`
- `worker`

Report reasons:

- `scam`
- `low_quality`
- `harassment`
- `fake_profile`
- `other`

Report statuses:

- `open`
- `reviewing`
- `resolved`
- `rejected`

Restriction features:

- `post_create`
- `worker_activity`

Restriction statuses:

- `active`
- `revoked`
- `expired`

## User Block Model

Collection: `user_block`.

| Field | Meaning |
| --- | --- |
| `blocker_id` | User who blocks. |
| `blocked_id` | User being blocked. |
| `block_profile` | Whether profile/feed visibility should be hidden. |
| `reason` | Optional reason, max 500. |
| `created_at`, `updated_at` | Manual timestamps. |

Unique index:

- `{ blocker_id: 1, blocked_id: 1 }`

Block behavior:

- Any block edge between two users blocks direct chat.
- `block_profile = true` hides profiles/posts/discovery surfaces where checked.
- Listing blocks populates blocked user public fields.

## Report Model

Collection: `report`.

| Field | Meaning |
| --- | --- |
| `reporter_id` | User who filed report. |
| `target_type` | `post` or `worker`. |
| `reason` | Report reason enum. |
| `description` | Required report text, max 2000. |
| `post_id` | Reported post when target is post. |
| `worker_id` | Reported worker when target is worker. |
| `target_user_id` | Author/worker user id for admin lookup. |
| `booking_id` | Optional booking context for worker report. |
| `evidence_urls` | Worker report evidence URLs, max 10. |
| `status` | `open`, `reviewing`, `resolved`, `rejected`. |
| `admin_note` | Optional admin note, max 2000. |
| `post_deleted_at` | Set when admin deletes reported post. |
| `post_create_restriction_id` | Restriction linked to post-create feature. |
| `worker_activity_restriction_id` | Restriction linked to worker activity. |
| `resolved_by`, `resolved_at` | Admin resolution metadata. |
| `pending_resolution_notify_at` | Deferred worker-report notification timestamp. |
| `created_at`, `updated_at` | Manual timestamps. |

Index:

- `{ target_type: 1, status: 1, created_at: -1 }`

## User Restriction Model

Collection: `user_restriction`.

| Field | Meaning |
| --- | --- |
| `user_id` | Restricted user. |
| `feature` | `post_create` or `worker_activity`. |
| `reason` | Required reason, max 1000. |
| `starts_at` | Restriction start, defaults now. |
| `ends_at` | Nullable expiry. Null means permanent until revoked. |
| `status` | `active`, `revoked`, or `expired`. |
| `created_by` | Admin who created restriction. |
| `revoked_by`, `revoked_at` | Revoke metadata. |
| `created_at`, `updated_at` | Manual timestamps. |

Index:

- `{ user_id: 1, feature: 1, status: 1, ends_at: 1 }`

Restriction lookup considers a restriction active when:

- `status = active`,
- `starts_at <= now`,
- and `ends_at` is null or greater than now.

## User Routes

All moderation routes require authentication.

Mounted under `/api/moderation`.

| Method | Route | CSRF | Purpose |
| --- | --- | --- | --- |
| `GET` | `/blocks` | No | List users blocked by current user. |
| `POST` | `/blocks` | Yes | Create/update a block. |
| `DELETE` | `/blocks/:blocked_user_id` | Yes | Remove a block. |
| `POST` | `/reports/post` | Yes | Report a post. |
| `GET` | `/reports/mine` | No | List current user's reports. |
| `GET` | `/reports/post/:post_id/open` | No | Get current user's open report for post. |
| `POST` | `/reports/worker` | Yes | Report a worker. |
| `GET` | `/reports/worker/:worker_id/open` | No | Get current user's open report for worker. |

Block validation:

- `blocked_user_id` valid ObjectId.
- `block_profile` optional boolean default false.
- `reason` optional nullable max 500.

Post report validation:

- `post_id` valid ObjectId.
- `reason` enum.
- `description` 10 to 2000 chars.

Worker report validation:

- `worker_id` valid ObjectId.
- optional `booking_id`.
- `reason` enum.
- `description` 10 to 2000 chars.
- `evidence_urls` max 10 valid URLs.

## Admin Routes

Mounted under `/api/moderation/admin` after `adminOnly`.

| Method | Route | CSRF | Purpose |
| --- | --- | --- | --- |
| `GET` | `/reports` | No | List all reports. |
| `PATCH` | `/reports/:id/status` | Yes | Update report status/admin note. |
| `GET` | `/restrictions` | No | List restrictions. |
| `POST` | `/restrictions` | Yes | Create restriction. |
| `PATCH` | `/restrictions/:id/revoke` | Yes | Revoke restriction. |
| `DELETE` | `/posts/:id` | Yes | Admin soft-delete post. |

Report query:

- `target_type`
- `status`
- `start_date`
- `end_date`
- `page`
- `limit`

Restriction query:

- `user_id`
- `feature`
- `status`
- `page`
- `limit`

## Block Flow

`POST /api/moderation/blocks`:

1. Reject blocking self.
2. Ensure blocked user exists.
3. Upsert `{ blocker_id, blocked_id }`.
4. Set `block_profile` and `reason`.
5. Return populated block.

Effects in other modules:

- Direct chat send checks for any block edge between sender and receiver.
- Chat conversation list displays outgoing/incoming block state.
- Worker profile/detail can be hidden by profile block.
- Discovery excludes profile-blocked worker ids.
- Feed excludes profile-blocked authors.
- Reactions honor profile block visibility for posts.

## Report Post Flow

`POST /api/moderation/reports/post`:

1. Load active post.
2. If current user already has an open report for this post, return it
   idempotently.
3. Determine post author as `target_user_id`.
4. Create report with `target_type: post`.
5. Snapshot post body/media if there is not already a report snapshot for this
   post.
6. Return report.

Post snapshots are stored in `post_edit_histories` with reason `report_filed`.

If the author later edits a post while an open report exists, post service
creates an `edited_after_report` snapshot before applying the edit.

## Report Worker Flow

`POST /api/moderation/reports/worker`:

1. Load worker user.
2. Require worker has `worker_profile`.
3. If current user already has an open worker report for this worker, return it
   idempotently.
4. Create report with:
   - `target_type: worker`,
   - `worker_id`,
   - `target_user_id = worker_id`,
   - optional `booking_id`,
   - evidence URLs.

Worker report does not automatically restrict the worker. Admin must create a
restriction if action is needed.

## Admin Report Status Flow

`PATCH /api/moderation/admin/reports/:id/status`.

Input:

- `status`: report status enum.
- `admin_note`: optional nullable max 2000.

Behavior:

- Updates report status/admin note.
- If status is `resolved` or `rejected`, sets `resolved_by` and `resolved_at`.
- If status is `resolved` and target is worker:
  - sets `pending_resolution_notify_at` to now + 60 seconds.

Why deferred for worker reports:

- Admin may resolve report and immediately create a restriction.
- The 60-second delay lets restriction attach first.
- If a worker activity restriction is attached, pending notify is cleared.
- If no restriction is attached, job later sends a "resolved clean" style
  notification.

## Restriction Flow

`POST /api/moderation/admin/restrictions`.

Input:

| Field | Rule |
| --- | --- |
| `user_id` | Valid ObjectId. |
| `feature` | `post_create` or `worker_activity`. |
| `reason` | 3 to 1000 chars. |
| `ends_at` | Optional nullable date. |
| `report_id` | Optional report to attach. |

Flow:

1. Ensure target user exists.
2. Create `UserRestriction` with `status: active`.
3. If `report_id` provided:
   - attach restriction id to report field based on feature,
   - if feature is `worker_activity`, clear pending worker-resolution
     notification.
4. Send moderation restriction applied notification.

Revoke:

- `PATCH /admin/restrictions/:id/revoke`.
- Sets `status: revoked`, `revoked_by`, `revoked_at`.
- Clears linked restriction ids from reports.

Expiry:

- Repository has `expireRestrictions(now)` to mark active expired restrictions
  as `expired`. Check job wiring before relying on automatic expiry.

## Admin Delete Post Flow

`DELETE /api/moderation/admin/posts/:id`.

Optional `report_id` can be supplied in body or query.

Flow:

1. Load active post.
2. Extract author id and body preview.
3. Soft-delete post as admin.
4. If report id supplied:
   - set `post_deleted_at`,
   - load report.
5. Find active `POST_CREATE` restriction for author.
6. Send post-deleted moderation notification to author, including report and
   restriction context when present.

Post delete is a post-level soft delete. Check social feed doc for cascade
behavior in author delete path.

## Feature Enforcement Points

`POST_CREATE` restriction:

- Enforced in `PostService.getActivePricingPackageForUser` before create quota
  checks.
- Error message: user is not allowed to create posts right now.

`WORKER_ACTIVITY` restriction:

- Enforced in worker detail via `workerService.getWorkerById`.
- Discovery excludes all users with active `WORKER_ACTIVITY` restriction.
- Favorite list excludes restricted workers.
- Error message: worker is not available right now.

## Deferred Worker Resolution Job

Source: `SERVER/src/jobs/moderation-resolution-notify.job.ts`.

Schedule:

- Cron: every 30 seconds.
- Job lock name: `moderation-resolution-notify`.
- Lock TTL: 60 seconds.

Flow:

1. Find due reports where `pending_resolution_notify_at <= now` and target is
   worker.
2. Claim each by clearing pending notify timestamp.
3. Skip if report already has `worker_activity_restriction_id`.
4. Check active worker restriction.
5. Send worker report resolved notification with restriction context if any.

## Notifications

Moderation notifications are sent through `notificationEventService`.

Types:

- `moderation.post_deleted`
- `moderation.report_resolved`
- `moderation.restriction_applied`

Channels:

- In-app and email for moderation/admin notification types.

Important notification flows:

- Restriction applied: sent immediately when admin creates restriction.
- Post deleted: sent when admin deletes post.
- Worker report resolved: sent by deferred job when report resolved and no
  immediate restriction notification supersedes it.

## Frontend Surfaces

User:

- `/client/blocked`
- Worker report button on worker profile.
- Report post actions in post UI.

Admin:

- `/dashboard/reports`
- Admin can filter reports, update report status, create restrictions, revoke
  restrictions, and delete reported posts depending on UI implementation.

Services/hooks:

- `services/moderation.service.ts`
- `lib/hooks/use-moderation.ts`

## Common Implementation Checklist

When changing moderation:

1. Decide whether the change is block, report, or restriction.
2. Keep block semantics symmetric for chat, but profile hiding only uses
   `block_profile`.
3. Keep report creation idempotent for same reporter/open target.
4. Preserve post snapshots on report and edit-after-report.
5. If adding restriction features, update constants, validation, repository,
   notification text, and enforcement points.
6. Do not assume report status alone restricts a user; restriction rows do.
7. Keep worker-report deferred notification behavior aligned with restriction
   creation.

## Known Implementation Nuances

- `getProfileBlockedIds` returns users blocked by viewer with
  `block_profile: true`; it does not include incoming blocks.
- `ensureChatAllowed` checks any block edge in either direction.
- Worker report resolve notification waits 60 seconds.
- `expireRestrictions` exists in repository but job wiring should be verified
  before saying restrictions expire automatically.
- Report list populates post media after fetching reports, so post report cards
  can show the reported media snapshot/current media context.
