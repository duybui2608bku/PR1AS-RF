# Memory Bank - Chat and Messaging

## Purpose

The chat module provides direct one-to-one messaging, booking/dispute group
messaging, unread tracking, soft delete, read receipts, Socket.IO events, and
chat notifications.

There are two separate conversation models:

- Direct conversations: client/worker/admin one-to-one messages.
- Group conversations: booking-based group messages, including dispute
  complaint rooms where admin can be added.

Primary source files:

- Routes: `SERVER/src/routes/chat/chat.routes.ts`
- Controller: `SERVER/src/controllers/chat/chat.controller.ts`
- Direct service: `SERVER/src/services/chat/chat.service.ts`
- Group service: `SERVER/src/services/chat/group-chat.service.ts`
- Direct repositories:
  `SERVER/src/repositories/chat/conversation.repository.ts`,
  `SERVER/src/repositories/chat/message.repository.ts`
- Group repository: `SERVER/src/repositories/chat/group-chat.repository.ts`
- Models: `SERVER/src/models/chat/*`
- Validation: `SERVER/src/validations/chat/chat.validation.ts`
- Socket helpers: `SERVER/src/utils/chat.helper.ts`
- Socket constants: `SERVER/src/constants/socket.ts`
- Frontend socket client: `pr1as-client/lib/chat-socket.ts`
- Frontend hooks: `pr1as-client/lib/hooks/use-chat.ts`,
  `pr1as-client/lib/hooks/use-chat-socket.ts`
- Frontend page/components:
  `pr1as-client/app/chat/page.tsx`,
  `pr1as-client/app/chat/group/page.tsx`,
  `pr1as-client/components/chat/chat-page.tsx`

## Message Types

`MessageType` values:

| Type | Meaning |
| --- | --- |
| `text` | Plain text message. |
| `image` | Image URL. |
| `video` | Video URL. |
| `audio` | Audio URL. |
| `file` | File URL. |

Text is sanitized server-side. Media messages keep URL content but validate URL
safety before storing.

## Direct Conversation Model

Collection: `conversation`.

| Field | Meaning |
| --- | --- |
| `sender_id` | First participant. |
| `receiver_id` | Second participant. |
| `last_message` | Last message id. |
| `created_at`, `updated_at` | Manual timestamps. |

Unique index:

- `{ sender_id: 1, receiver_id: 1 }`

The repository normalizes or finds conversations so callers do not create
parallel threads for the same pair.

## Direct Message Model

Collection: `message`.

| Field | Meaning |
| --- | --- |
| `conversation_id` | Parent conversation id. |
| `sender_id` | Sender user id. |
| `receiver_id` | Receiver user id. |
| `type` | Message type. |
| `content` | Text or media URL. |
| `is_read` | Direct read state. |
| `is_deleted` | Soft delete flag. |
| `read_at` | Direct read timestamp. |
| `reply_to_id` | Optional parent direct message. |
| `created_at`, `updated_at` | Manual timestamps. |

Indexes:

- `{ conversation_id: 1, created_at: -1 }`
- `{ receiver_id: 1, is_read: 1, read_at: 1 }`

## Group Conversation Model

Collection: `conversation_group`.

| Field | Meaning |
| --- | --- |
| `booking_id` | Booking id, unique per group. |
| `name` | Display name. Normal booking group uses service code; complaint group uses complaint name. |
| `members` | User ids allowed in the group. |
| `last_message` | Last group message id. |
| `created_at`, `updated_at` | Manual timestamps. |

Unique index:

- `booking_id`

The unique booking id means there is at most one group conversation per booking.
Complaint creation upgrades/adds members to the same group instead of creating a
second group.

## Group Message Model

Collection: `message_group`.

| Field | Meaning |
| --- | --- |
| `conversation_group_id` | Parent group id. |
| `sender_id` | Sender user id. |
| `type` | Message type. |
| `content` | Message content. |
| `read_by` | Array of `{ user_id, read_at }`. |
| `is_deleted` | Soft delete flag. |
| `reply_to_id` | Optional parent group message. |
| `created_at`, `updated_at` | Manual timestamps. |

Indexes:

- `{ conversation_group_id: 1, created_at: -1 }`
- `{ sender_id: 1 }`
- `{ reply_to_id: 1 }`

## Direct Chat Authorization

Direct chat is not open between arbitrary users.

`ensureDirectChatAllowed(sender, receiver)`:

1. If sender or receiver is admin, allow.
2. If sender active role is client:
   - receiver must have worker role,
   - pair must have a confirmed booking with sender as client and receiver as
     worker.
3. If sender active role is worker:
   - receiver must have client role,
   - pair must have a confirmed booking with receiver as client and sender as
     worker.
4. Otherwise reject with `DIRECT_ROLE_NOT_ALLOWED`.

The booking check uses `bookingRepository.hasConfirmedBookingForPair`.

Block check:

- `moderationService.ensureChatAllowed(sender, receiver)` runs at send time.
- Any block edge between the two users blocks direct chat.

Conversation read/list checks re-run authorization so stale conversation ids
cannot bypass role/booking rules.

## Direct Message Send Flow

`POST /api/chat/messages`.

Validation:

- `receiver_id` required.
- `type` must be `text`, `image`, `video`, `audio`, or `file`.
- `content` required, max 2000.
- `reply_to_id` optional nullable.

Flow:

1. Load sender and receiver.
2. Reject missing receiver.
3. Reject self-message.
4. Check moderation block.
5. Check direct chat authorization.
6. If type is `text`, sanitize content and reject empty result.
7. If type is media/file, validate media URL.
8. If replying, ensure the referenced message is accessible to sender.
9. Find or create conversation.
10. Create message.
11. Update conversation last message.
12. Emit `new_message` to receiver user room.
13. Emit `new_message` to sender user room.
14. Emit `new_message` to conversation room.
15. If receiver is not currently in the conversation room, create chat
    notification.

## Direct Message Read/List/Delete

`GET /api/chat/messages`:

- Requires `conversation_id` or `receiver_id`.
- Supports `page`, `limit`, and `before_id` cursor.
- Rechecks access by receiver pair or conversation id.

`GET /api/chat/conversations`:

- Lists conversations for user.
- Batch-loads other users, last messages, unread counts.
- Filters conversations by active role's confirmed booking peers unless admin.
- Adds block state:
  - `is_blocked` for outgoing block,
  - `has_blocked_me` for incoming block,
  - `block_profile` from outgoing block.

`GET /api/chat/conversations/:conversation_id`:

- Loads one conversation with details.
- Rechecks active-role authorization.
- Adds other user and unread count.

`PATCH /api/chat/messages/read`:

- Accepts `message_ids` or `conversation_id`.
- If conversation id is supplied, user must be participant and still allowed.
- Marks receiver messages read.
- Emits `message_read` to conversation room.

`DELETE /api/chat/messages/:message_id`:

- Only sender can delete.
- Soft deletes message.
- Emits `message_deleted` to conversation room.

`GET /api/chat/messages/unread`:

- Returns unread count, optionally scoped to `conversation_id`.

## Group Chat Authorization

Group chat is booking-based.

`sendGroupMessage`:

1. Load booking.
2. Determine booking client and worker ids.
3. If sender is client or worker participant, find/create group by booking.
4. If sender is not booking participant, only allow if they are already a group
   member.
5. Sender must be in `conversation.members`.
6. If replying, referenced group message must be accessible to sender.

For normal booking group creation:

- `booking_id` unique.
- name is the booking `service_code`.
- members are client and worker.

Complaint/dispute group:

- Only booking client or worker can request creation.
- Booking must be `disputed`.
- First admin user is loaded and added as a member.
- Existing booking group is updated with client, worker, admin members and a
  complaint name.

## Group Routes

All are mounted under `/api/chat` and require auth.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/group/messages` | Send group message. |
| `GET` | `/group/messages` | Get group messages by `booking_id` or `conversation_group_id`. |
| `GET` | `/group/conversations` | List current user's group conversations. |
| `GET` | `/group/conversations/:conversation_group_id` | Get one group conversation. |
| `PATCH` | `/group/messages/read` | Mark group messages read. |
| `GET` | `/group/messages/unread` | Group unread count. |
| `POST` | `/group/complaint` | Create complaint group for disputed booking. |

`/group/complaint` has `groupComplaintLimiter`.
Sending messages has `chatSendLimiter`.

## Group Message Flow

`POST /api/chat/group/messages`:

1. Validate `booking_id`, `type`, `content`, optional `reply_to_id`.
2. Check booking and membership rules.
3. Check reply message if needed.
4. Create group message.
5. Add sender to `read_by`.
6. Update group last message.
7. Emit `new_message` to each member's user room.
8. Emit `new_message` to group room.
9. For members not currently viewing group room, create group chat
   notification.

## Group Read/List Behavior

`GET /group/messages`:

- Accepts either `booking_id` or `conversation_group_id`.
- Resolves booking id to group id only if user is a member.
- Requires a final group id.
- Messages are returned oldest-to-newest within the page after repository
  fetches newest-first and reverses the result.

`PATCH /group/messages/read`:

- Accepts `message_ids` or `conversation_group_id`.
- Verifies provided messages belong to conversations the user is member of.
- Uses `$addToSet` on `read_by`.
- Emits `message_read` to group room when scoped by group id.

Unread counts:

- Count messages in groups where user is a member and `read_by.user_id` does
  not contain user.

## Socket Events and Rooms

Rooms:

| Room | Helper |
| --- | --- |
| `user:<userId>` | `getUserRoom` |
| `conversation:<conversationId>` | `getConversationRoom` |
| `conversation_group:<groupId>` | `getGroupConversationRoom` |

Socket events used by chat:

| Event | Purpose |
| --- | --- |
| `new_message` | New direct or group message. |
| `message_read` | Read receipt. |
| `message_deleted` | Soft-deleted direct message. |
| `notification:new` | In-app notification event from notification module. |
| `notification:unread_count` | Notification unread count update. |
| `account:banned` | Account status forced logout path. |

## Notifications

Direct chat notification:

- Type: `chat.message`.
- Channels: in-app and push.
- Dedupe key: `chat-message:<messageId>:<recipientId>`.
- Link: `/chat?conversation_id=<id>`.

Group chat notification:

- Type: `chat.group_message`.
- Channels: in-app and push.
- Dedupe key: `chat-message:<messageId>:<recipientId>`.
- Link: `/chat?conversation_group_id=<id>`.

Notifications are skipped if recipient is already in the active conversation
room.

## Admin Contact

`GET /api/chat/admin-contact`:

- Requires auth.
- Uses `adminContactLimiter`.
- Returns the first admin user formatted as chat user, or null.

Admin direct chat bypasses the confirmed-booking pair restriction.

## Frontend Surfaces

Primary surfaces:

- `/chat`
- `/chat/group`
- `/client/chat`
- `components/chat/chat-page.tsx`
- `lib/chat-socket.ts`
- `lib/hooks/use-chat.ts`
- `lib/hooks/use-chat-socket.ts`
- `services/chat.service.ts`

The same Socket.IO singleton is also used by notification hooks.

## Common Implementation Checklist

When changing chat:

1. Decide whether the change is direct chat, group chat, or both.
2. Preserve direct chat authorization by role + confirmed booking.
3. Preserve moderation block checks for direct messages.
4. Sanitize text and validate media URLs before persisting.
5. Recheck access for reads, not only sends.
6. Keep reply checks scoped to accessible messages.
7. Emit to user rooms and active conversation rooms.
8. Avoid sending duplicate notifications when recipient is already viewing.
9. Update frontend message types and optimistic UI if response shape changes.

## Known Implementation Nuances

- Direct conversation uniqueness depends on repository normalization. Do not
  manually insert direct conversations without checking pair ordering behavior.
- Group conversations are unique by booking id, so complaint chat upgrades the
  existing booking group instead of creating a separate dispute-only room.
- Text sanitization is only in direct chat service currently; group chat stores
  supplied content after validation. If group rich content expands, align this.
- Direct conversation list total is the filtered visible count after role/peer
  filtering, not necessarily raw DB total.
- Deleting a direct message is soft delete and emits an event; group message
  delete route is not currently exposed.
