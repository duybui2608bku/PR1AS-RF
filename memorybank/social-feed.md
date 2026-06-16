# Memory Bank - Social Feed

## Purpose

The social feed module stores job posts, media, comments, reactions, hashtags,
and worker registrations on posts. In current product behavior, posts are job
listings created by clients; workers can register/apply to posts.

Create post is not open to every role. It is gated by:

- current `last_active_role` must be `client`,
- reputation score must be at least 30,
- active pricing package must have `create_job_enabled`,
- monthly post count must be under `create_job_limit` unless the limit is null,
- no active moderation restriction for `POST_CREATE`.

Primary source files:

- Post routes: `SERVER/src/routes/post/post.routes.ts`
- Comment routes:
  `SERVER/src/routes/comment/post-comment-nested.routes.ts`,
  `SERVER/src/routes/comment/comment.routes.ts`
- Reaction routes: `SERVER/src/routes/reaction/reaction.routes.ts`
- Hashtag routes: `SERVER/src/routes/hashtag/hashtag.routes.ts`
- Post service: `SERVER/src/services/post/post.service.ts`
- Comment service: `SERVER/src/services/comment/comment.service.ts`
- Reaction service: `SERVER/src/services/reaction/reaction.service.ts`
- Hashtag service: `SERVER/src/services/hashtag/hashtag.service.ts`
- Post models: `SERVER/src/models/post/*`
- Comment model: `SERVER/src/models/comment/comment.model.ts`
- Reaction model: `SERVER/src/models/reaction/reaction.model.ts`
- Hashtag models: `SERVER/src/models/hashtag/*`
- Validation:
  `SERVER/src/validations/post/post.validation.ts`,
  `SERVER/src/validations/comment/comment.validation.ts`,
  `SERVER/src/validations/reaction/reaction.validation.ts`,
  `SERVER/src/validations/hashtag/hashtag.validation.ts`
- Frontend page: `pr1as-client/app/posts/page.tsx`
- Frontend components: `pr1as-client/components/post/*`
- Frontend services/hooks:
  `pr1as-client/services/post.service.ts`,
  `pr1as-client/services/post-registration.service.ts`,
  `pr1as-client/lib/hooks/use-posts.ts`,
  `pr1as-client/lib/hooks/use-post-registrations.ts`

## Post Model

Collection: `post`.

| Field | Meaning |
| --- | --- |
| `author_id` | User who created the post. |
| `body` | Sanitized text, 1 to 5000 chars. |
| `visibility` | `public` or `private`. |
| `comments_count` | Denormalized comment count. |
| `reactions_count` | Denormalized post reaction count. |
| `comments_locked` | Blocks non-author comments when true. |
| `created_at`, `updated_at` | Manual timestamps. |
| `deleted`, `deleted_at` | Soft delete state. |

Indexes:

- `{ author_id: 1, created_at: -1 }`
- `{ created_at: -1, _id: -1 }`
- `deleted_at`

Feed pagination uses compound cursor `(created_at desc, _id desc)`.

## Post Media Model

Collection: `post_media`.

| Field | Meaning |
| --- | --- |
| `post_id` | Parent post. |
| `sort_order` | Media order. |
| `type` | `image` or `video`. |
| `url` | Media URL. |
| `storage_key` | Optional storage key. |
| `mime_type` | Optional MIME type. |
| `byte_size` | Optional byte size. |
| `duration_seconds` | Optional video duration. |
| `created_at` | Timestamp. |

Index:

- `{ post_id: 1, sort_order: 1 }`

Media limits:

| Limit | Value |
| --- | --- |
| Max media per post | 10 |
| Image MIME types | jpeg, png, webp, gif, heic, heif |
| Video MIME types | mp4, webm, quicktime, matroska |
| Max image size | 15 MB |
| Max video size | 200 MB |
| Max video duration | 600 seconds |

Media URLs must be `http` or `https`; when `config.media.allowedHosts` is set,
the hostname must match the whitelist.

## Post Edit History

Collection: `post_edit_histories`.

Used by moderation.

| Field | Meaning |
| --- | --- |
| `post_id` | Reported/edited post. |
| `author_id` | Post author. |
| `body_snapshot` | Body before report/edit. |
| `media_snapshot` | Media before report/edit. |
| `reason` | `report_filed` or `edited_after_report`. |
| `report_id` | Optional related report. |
| `snapshot_at` | Snapshot timestamp. |

Snapshots are created:

- when a report is filed against a post,
- when a post with an open report is edited.

This prevents bait-and-switch after a report.

## Post Routes

Mounted under `/api/posts`.

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/` | Auth + CSRF + create limiter | Create post/job. |
| `GET` | `/` | Optional auth | Cursor-paginated feed. |
| `GET` | `/registered` | Auth | Worker registered posts feed. |
| `GET` | `/:id` | Optional auth | Get post detail. |
| `PATCH` | `/:id` | Auth + CSRF | Update own post. |
| `DELETE` | `/:id` | Auth + CSRF | Soft delete own post. |
| `PATCH` | `/:id/comments-lock` | Auth + CSRF | Lock/unlock comments on own post. |
| `POST` | `/:id/registrations` | Auth + CSRF | Toggle worker registration. |
| `GET` | `/:id/registrations` | Auth | List registrations for post owner. |
| `GET` | `/:postId/comments` | Optional auth | List comments. |
| `POST` | `/:postId/comments` | Auth + CSRF | Create comment. |

Standalone comment routes under `/api/comments`:

- `PATCH /:id` update own comment.
- `DELETE /:id` soft delete own comment or post owner's comment.

## Create Post Flow

`PostService.createPost`.

Rules:

1. Load user.
2. Require reputation score >= 30.
3. Require `last_active_role === client`.
4. Ensure default pricing packages exist.
5. Ensure current user plan is active, downgrading expired plans if needed.
6. Load active `PricingPackage` from DB.
7. Assert no active `POST_CREATE` restriction.
8. Read `features.create_job_enabled`.
9. Count posts created by author in current month using Asia/Ho_Chi_Minh month
   boundaries.
10. Enforce `features.create_job_limit` when non-null.
11. Validate media count and metadata.
12. Sanitize body with max length 5000.
13. Create post.
14. Bulk create media rows.
15. Parse/sync hashtags from body.
16. Return public post payload.

Important: package features come from DB-backed `PricingPackage`, not hard-coded
frontend constants.

## Feed and Visibility

`GET /api/posts` supports:

| Query | Meaning |
| --- | --- |
| `cursor` | Cursor for compound pagination. |
| `limit` | Default 10, max 50. |
| `author_id` | Filter by author. |
| `hashtag` | Filter by hashtag slug. |

Visibility rules:

- General anonymous feed: public posts only.
- General authenticated feed: public posts plus viewer's private posts.
- Author profile feed:
  - if viewer is author, include own private posts,
  - otherwise public posts only.
- If viewer profile-blocked an author, that author's posts are excluded.
- If `author_id` is blocked by viewer, feed returns empty.

Enrichment:

- media,
- hashtags,
- reaction summary,
- viewer's reaction,
- registrations count,
- viewer's registration state.

## Update and Delete Post

Update rules:

- Post must exist and not be deleted.
- Only author can update.
- Body is sanitized.
- Media is replaced if `media` is supplied.
- Hashtags are resynced when body changes.
- If body/media changes while an open post report exists, pre-edit state is
  snapshotted.

Delete rules:

- Post must exist and not be deleted.
- Only author can delete through post route.
- Admin can delete through moderation route.
- Soft delete runs in a transaction when supported:
  - mark post deleted,
  - clear post hashtags,
  - soft delete comments,
  - delete post reactions,
  - delete comment reactions.

## Comments

Collection: `comment`.

| Field | Meaning |
| --- | --- |
| `post_id` | Parent post. |
| `author_id` | Comment author. |
| `parent_comment_id` | Null for top-level; points to top-level comment for replies. |
| `body` | Sanitized text, 1 to 2000 chars. |
| `created_at`, `updated_at` | Manual timestamps. |
| `deleted_at` | Soft delete timestamp. |

Comment rules:

- Reputation score must be >= 30.
- Post must exist and not be deleted.
- If post comments are locked, only post author may comment.
- Replies are one-level only. A reply cannot reply to another reply.
- Parent comment must belong to the same post.
- Body is sanitized.
- Creating increments post `comments_count`.
- Deleting decrements post `comments_count` and deletes comment reactions.

Comment list:

- Cursor-paginated top-level comments.
- Replies for visible top-level comments are loaded and nested one level.

## Reactions

Collection: `reaction`.

Target types:

- `post`
- `comment`

Reaction types:

- `like`
- `love`
- `haha`
- `wow`
- `sad`
- `angry`

Unique index:

- `{ user_id, target_type, target_id }`

Reaction rules:

- Target id must be valid.
- Post target must exist and be visible to viewer.
- Private post can be reacted to only by author.
- Profile blocks hide/react-block posts in both directions.
- Comment target also validates the parent post is reachable.
- Upsert and remove try to run reaction row and post counter update in a
  transaction.
- If Mongo transactions are unavailable, service logs and falls back to
  sequential writes.

Routes under `/api/reactions`:

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/summary` | Get reaction counts and my reaction. |
| `POST` | `/` | Upsert reaction. |
| `DELETE` | `/` | Remove reaction. |

All reaction routes require auth in current route file.

## Hashtags

Hashtag parsing:

- Regex matches Unicode letters/digits/underscore after start or whitespace.
- Max tag length 50.
- Max tags per post 10 through parser/limits.

Models:

- `hashtag`: unique `slug`, plus `display`.
- `post_hashtag`: unique `{ post_id, hashtag_id }`.

Routes:

- `GET /api/hashtags/trending`

Trending query:

| Query | Meaning |
| --- | --- |
| `window` | `24h` default or `7d`. |
| `limit` | default 10, max 50. |

## Worker Registrations

Collection: `post_registration`.

| Field | Meaning |
| --- | --- |
| `post_id` | Job post. |
| `worker_id` | Worker who registered/applied. |
| `created_at` | Registration time. |

Indexes:

- Unique `{ post_id, worker_id }`.
- `{ worker_id, created_at: -1 }`.
- `{ post_id, created_at: -1 }`.

Toggle registration:

1. Post must exist.
2. User must have `worker_profile`.
3. Worker cannot register on their own post.
4. Toggle creates/removes row.
5. Return `{ registered, registrations_count }`.

List registrations:

- Only post author can list registrations for that post.

Registered feed:

- `GET /api/posts/registered`.
- For current worker, lists posts they registered for.
- Cursor is an index into the worker's post id list.

## Pricing Integration

Create post quota uses DB pricing package:

```ts
PricingPackage.features.create_job_enabled
PricingPackage.features.create_job_limit
```

Plan expiry is checked through pricing service before reading package features.
This means a user whose paid plan expired may be downgraded before quota is
evaluated.

## Moderation Integration

Social feed integrates moderation in several places:

- Profile blocks hide posts/feed results.
- Post create checks active `POST_CREATE` restriction.
- Post report creates snapshot.
- Editing reported post creates snapshot.
- Admin delete post sends moderation notification and may be linked to a report.

## Frontend Surfaces

Primary frontend:

- `/posts`
- `components/post/create-post-form.tsx`
- `components/post/post-feed.tsx`
- `components/post/post-card.tsx`
- `components/post/post-comments.tsx`
- `components/post/comments-sheet.tsx`
- `components/post/reaction-picker.tsx`
- `components/post/registrants-sheet.tsx`
- `components/post/trending-hashtags.tsx`

Hooks/services:

- `services/post.service.ts`
- `services/post-registration.service.ts`
- `lib/hooks/use-posts.ts`
- `lib/hooks/use-post-registrations.ts`

## Common Implementation Checklist

When changing social feed:

1. Confirm whether the change applies to job posts, comments, reactions, or
   registrations.
2. Preserve create-post gates: client active role, reputation, pricing feature,
   quota, moderation restriction.
3. Sanitize body/comment text before storing.
4. Keep private visibility rules consistent for posts, comments, and reactions.
5. Keep soft-delete cascade for comments/reactions/hashtags.
6. Snapshot reported content before report/edit changes.
7. Update denormalized counts atomically where possible.
8. Update frontend query keys and cursor behavior if response changes.

## Known Implementation Nuances

- Current create post logic requires active client role. Do not document that
  workers can create posts unless this code changes.
- `comments_count` is decremented by one when deleting a comment, even if the
  deleted top-level comment has replies. Check count semantics before changing
  nested delete behavior.
- Reaction summary route requires auth even though service supports nullable
  user id.
- `comments_locked` blocks non-author comments, but post author can still
  comment/reply.
- `PostVisibility.PRIVATE` is enforced in feed/reaction access; check any new
  endpoint for private visibility leaks.
