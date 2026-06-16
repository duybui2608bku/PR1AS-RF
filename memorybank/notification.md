# Memory Bank - Notification System

## Purpose

The notification module creates durable in-app notifications, dispatches
notifications through in-app/email/push channels, stores delivery state and
logs, manages user notification preferences, stores push subscriptions, emits
Socket.IO notification events, and provides notification list/unread APIs.

It is a cross-cutting service used by booking, wallet, chat, review,
reputation, moderation, account status, and reconciliation jobs.

Primary source files:

- Routes: `SERVER/src/routes/notification/notification.routes.ts`
- Controller: `SERVER/src/controllers/notification/notification.controller.ts`
- Service: `SERVER/src/services/notification/notification.service.ts`
- Event facade:
  `SERVER/src/services/notification/notification-events.service.ts`
- Repository: `SERVER/src/repositories/notification/notification.repository.ts`
- Models:
  `SERVER/src/models/notification/notification.model.ts`,
  `SERVER/src/models/notification/notification-preference.model.ts`,
  `SERVER/src/models/notification/push-subscription.model.ts`,
  `SERVER/src/models/notification/notification-delivery-log.model.ts`
- Adapters:
  `SERVER/src/services/notification/adapters/in-app-notification.adapter.ts`,
  `SERVER/src/services/notification/adapters/email-notification.adapter.ts`,
  `SERVER/src/services/notification/adapters/push-notification.adapter.ts`
- Constants: `SERVER/src/constants/notification.ts`
- Validation: `SERVER/src/validations/notification/notification.validation.ts`
- Frontend:
  `pr1as-client/app/notifications/page.tsx`,
  `pr1as-client/components/layout/notification-bell.tsx`,
  `pr1as-client/services/notification.service.ts`,
  `pr1as-client/lib/hooks/use-notifications.ts`

## Channels, Categories, Priority

Channels:

- `in_app`
- `email`
- `push`

Categories:

- `booking`
- `wallet`
- `chat`
- `review`
- `dispute`
- `security`
- `admin`
- `system`
- `reputation`

Priorities:

- `low`
- `normal`
- `high`
- `urgent`

Delivery statuses:

- `pending`
- `sent`
- `skipped`
- `failed`

## Notification Types

Core types:

| Type | Main producer |
| --- | --- |
| `booking.created` | Booking created. |
| `booking.status_updated` | Booking status changed. |
| `booking.updated` | Booking schedule/notes updated. |
| `booking.cancelled` | Booking cancelled. |
| `booking.reminder` | Booking reminder job. |
| `dispute.created` | Booking dispute opened. |
| `dispute.resolved` | Admin dispute resolution. |
| `wallet.deposit_success` | SePay deposit success and plan activation message path. |
| `wallet.deposit_failed` | SePay amount mismatch/failure. |
| `wallet.hold_created` | Reserved constant. |
| `wallet.refund_created` | Reserved constant. |
| `chat.message` | Direct chat message. |
| `chat.group_message` | Group chat message. |
| `review.created` | New review. |
| `review.updated` | Updated review. |
| `security.alert` | Security/admin alert such as wallet reconciliation. |
| `account.banned` | Admin ban. |
| `account.unbanned` | Admin unban. |
| `system.announcement` | Reserved/system announcements. |
| `reputation.warning` | Reputation warning threshold. |
| `moderation.post_deleted` | Admin deleted post. |
| `moderation.report_resolved` | Worker report resolved notification. |
| `moderation.restriction_applied` | Admin applied feature restriction. |

## Notification Model

Collection: `notification`.

| Field | Meaning |
| --- | --- |
| `recipient_id` | User receiving notification. |
| `actor_id` | Optional actor user. |
| `type` | Notification type enum. |
| `category` | Category enum. |
| `title` | Rendered title. |
| `body` | Rendered body. |
| `data` | Structured metadata. |
| `link` | Frontend link. |
| `priority` | Priority enum. |
| `channels` | Channels selected for this notification. |
| `delivery` | Embedded delivery state per channel. |
| `dedupe_key` | Optional dedupe key. |
| `read_at` | Read timestamp. |
| `archived_at` | Archive timestamp. |
| `expires_at` | Optional expiry timestamp. |
| `created_at`, `updated_at` | Manual timestamps. |

Indexes:

- `{ recipient_id: 1, read_at: 1, created_at: -1 }`
- `{ recipient_id: 1, archived_at: 1, created_at: -1 }`
- `{ recipient_id: 1, type: 1, created_at: -1 }`
- unique partial `{ recipient_id: 1, dedupe_key: 1 }`
- TTL on `created_at` with 90-day retention.

Dedupe behavior:

- Service appends recipient id to caller-provided dedupe key:
  `input.dedupe_key + ":" + recipientId`.
- Repository upserts by `{ recipient_id, dedupe_key }`.
- On duplicate-key race, repository retries the upsert.
- Existing notification link is updated to newest link.

## Preference Model

Collection: `notification_preference`.

| Field | Meaning |
| --- | --- |
| `user_id` | Unique user id. |
| `channels.in_app` | Channel enabled flag. Default true. |
| `channels.email` | Channel enabled flag. Default true. |
| `channels.push` | Channel enabled flag. Default true. |
| `muted_types` | Notification types muted by user. |
| `created_at`, `updated_at` | Manual timestamps. |

Preferences are created lazily on first use.

If a type is muted, no notification row is created for that recipient.
If a channel is disabled, that channel is removed from delivery for that
recipient.

## Push Subscription Model

Collection: `push_subscription`.

| Field | Meaning |
| --- | --- |
| `user_id` | Owner. |
| `endpoint` | Web push endpoint, unique. |
| `keys.p256dh`, `keys.auth` | Web push keys. |
| `user_agent` | Browser user agent. |
| `is_active` | Active subscription flag. |
| `created_at`, `updated_at`, `last_used_at` | Timestamps. |

Push behavior:

- Upsert by endpoint.
- Deleting a subscription deactivates it.
- Push adapter deactivates endpoint on HTTP 404 or 410 from web-push provider.

## Delivery Log Model

Collection: `notification_delivery_log`.

| Field | Meaning |
| --- | --- |
| `notification_id` | Notification id. |
| `recipient_id` | Recipient user id. |
| `channel` | Delivery channel. |
| `status` | Delivery status. |
| `provider` | `in_app`, `email`, or `push`. |
| `error` | Optional error message. |
| `metadata` | Optional provider metadata. |
| `created_at` | Log timestamp. |

Each dispatch attempt updates embedded delivery state and writes a delivery log.

## Routes

Mounted under `/api/notifications`.

All routes require authentication.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/` | Paginated notification list. |
| `GET` | `/unread-count` | Current unread count. |
| `GET` | `/preferences` | Get/create preferences. |
| `PATCH` | `/preferences` | Update channels/muted types. |
| `GET` | `/push-public-key` | Return VAPID public key and enabled flag. |
| `POST` | `/push-subscriptions` | Save/upsert push subscription. |
| `DELETE` | `/push-subscriptions/:id` | Deactivate push subscription. |
| `PATCH` | `/read-all` | Mark all notifications read. |
| `PATCH` | `/read-by-conversation` | Mark chat notifications by conversation read. |
| `PATCH` | `/:id/read` | Mark one notification read. |

List query:

- `unread`: boolean or `"true"/"false"`.
- `category`: optional category enum.
- `type`: optional notification type enum.
- Pagination middleware default limit 20.

Preferences update:

```ts
{
  channels?: {
    in_app?: boolean,
    email?: boolean,
    push?: boolean
  },
  muted_types?: NotificationType[]
}
```

Push subscription:

```ts
{
  endpoint: string,
  keys: { p256dh: string, auth: string }
}
```

## Notify Flow

`notificationService.notify(input)`.

Flow:

1. Deduplicate recipient ids.
2. Filter recipients to active users only.
3. Resolve type config:
   - category,
   - priority,
   - default channels.
4. For each active recipient:
   - get/create preference,
   - skip if muted type,
   - filter channels by preference,
   - skip if no channels remain,
   - create/upsert notification row with recipient-specific dedupe key,
   - dispatch channels asynchronously.
5. Return created notification documents.

Active-recipient filter is strict:

- only `UserStatus.ACTIVE` users receive notifications.
- banned, inactive, pending-delete, deleted, and pending-verify users are
  skipped.

## Default Type Config

Examples from `NOTIFICATION_TYPE_CONFIG`:

| Type | Category | Priority | Channels |
| --- | --- | --- | --- |
| Booking created/status/cancel/reminder | booking | high | in-app, email, push |
| Dispute created | dispute | urgent | in-app, email, push |
| Dispute resolved | dispute | high | in-app, email, push |
| Wallet deposit success/failed | wallet | high | in-app, email, push |
| Chat direct/group | chat | normal | in-app, push |
| Moderation post/report/restriction | admin | high | in-app, email |

When no specific config exists, default is system/normal/in-app unless caller
overrides category/channels/priority.

## Delivery Adapters

In-app adapter:

- Emits `notification:new` to `user:<recipientId>`.
- Reads current unread count.
- Emits `notification:unread_count`.
- Returns `sent` even if socket emit fails; failures are logged.

Email adapter:

- Loads recipient by id.
- Skips if no email.
- Escapes body as HTML with newline-to-`<br>`.
- Sends through `nodemailerUtils`.

Push adapter:

- Requires VAPID subject, public key, and private key.
- Loads active push subscriptions for recipient.
- Skips if not configured or no active subscriptions.
- Sends JSON payload with title/body/data/link/notification id.
- Marks subscription `last_used_at` on success.
- Deactivates endpoint on 404/410.
- Fails only when no subscription send succeeds.

## Read and Unread Flow

Mark one read:

1. Update notification owned by current user.
2. Emit updated unread count.
3. Emit `notification:read` with notification id and read time.

Mark all read:

1. Set `read_at` for all unread, unarchived notifications for user.
2. Emit updated unread count.
3. Emit `notification:read` with `{ all: true }`.

Mark by conversation:

- For direct chat, matches type `chat.message` and `data.conversation_id`.
- For group chat, matches type `chat.group_message` and
  `data.conversation_group_id`.
- Emits unread count only if updated count > 0.

Unread count excludes:

- read notifications,
- archived notifications,
- expired notifications.

## Event Facade

`notificationEventService` centralizes product events into notification content.

Booking:

- `bookingCreated`
- `bookingStatusUpdated`
- `bookingCancelled`
- `bookingAutoExpiredWarning`
- `bookingUpdated`
- `bookingReminder`

Dispute:

- `disputeCreated`
- `disputeResolved`

Wallet:

- `walletEvent`
- `walletBalanceReconciliationAlert`

Chat:

- `chatMessage`

Review:

- `reviewCreated`
- `reviewUpdated`

Reputation:

- `reputationWarning`

Moderation:

- `postDeletedByAdmin`
- `workerReportResolved`
- `userRestrictionApplied`

Account status:

- `accountBanned`
- `accountUnbanned`

Localization:

- Event facade reads recipient `meta_data.locale`.
- Falls back to `en` if user lookup fails.
- Date/time formatting uses `Asia/Ho_Chi_Minh`.

## Frontend Behavior

Frontend service:

- `notification.service.ts` lists notifications, unread count, mark read, mark
  all read, and mark by conversation.
- It normalizes `is_read` from `read_at`.
- It has frontend fallback strings for common notification types/statuses.

React Query hooks:

- `useNotifications`
- `useNotificationsInfinite`
- `useUnreadNotificationCount`
- `useMarkNotificationAsRead`
- `useMarkAllNotificationsAsRead`
- `useMarkNotificationsByConversation`
- `useNotificationSocket`

Socket hook:

- Waits for auth store hydration.
- Uses existing chat socket singleton.
- Listens for `notification:new` and invalidates notification queries.
- Listens for `notification:unread_count` and updates cached unread count.

## Environment Variables

Push notifications require VAPID configuration:

- `WEB_PUSH_VAPID_SUBJECT`
- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`

Email notifications require SMTP configuration used by `nodemailerUtils`.

## Common Implementation Checklist

When adding a notification:

1. Add/confirm `NotificationType`.
2. Add type config if default category/priority/channels are not enough.
3. Add event helper in `notification-events.service.ts`.
4. Use recipient locale when rendering user-facing content.
5. Choose a stable dedupe key.
6. Include useful `data` for navigation and mark-by-context behavior.
7. Add frontend fallback if server message may be untranslated or legacy.
8. Confirm notification should be sent only to active users.

## Known Implementation Nuances

- `dedupe_key` uniqueness is per recipient because service appends recipient id.
- Notification TTL deletes rows after 90 days based on `created_at`.
- Preference mute skips creating a notification row entirely, not just delivery.
- Push public key route requires auth even though public key itself is not a
  secret.
- `wallet.planActivated` currently goes through `walletEvent` with notification
  type `wallet.deposit_success`.
- In-app adapter logs socket errors but still records delivery as sent.
