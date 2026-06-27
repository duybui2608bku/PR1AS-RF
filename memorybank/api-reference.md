# Memory Bank - API Reference

## Scope

This document lists the REST API routes mounted by `SERVER/src/routes/index.ts`.
The source code remains authoritative. Each module memory document describes the
workflow and business rules in more detail.

Base URL in development:

```txt
http://localhost:3000/api
```

## Common Rules

Authentication:

- Most protected routes use backend cookies set by auth endpoints.
- `Authorization: Bearer <access_token>` is also supported by auth middleware.

CSRF:

```txt
GET /api/csrf-token
```

State-changing protected routes usually require the CSRF token. Webhooks use
their own verification instead.

Response envelope:

```ts
{
  success: boolean;
  statusCode: number;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
    stack?: string;
  };
}
```

Pagination:

- List endpoints commonly accept `page` and `limit`.
- Paginated responses include a pagination object.

## Auth - `/api/auth`

See [auth.md](./auth.md).

| Method | Path | Auth | CSRF | Meaning |
| --- | --- | --- | --- | --- |
| `POST` | `/register` | No | Yes | Register and send verification email. |
| `POST` | `/login` | No | Yes | Email/password login. |
| `POST` | `/refresh-token` | Refresh | Yes | Rotate tokens. |
| `GET` | `/me` | User | No | Current user. |
| `POST` | `/logout` | User | Yes | Clear refresh hash and cookies. |
| `GET` | `/me/deletion-status` | User | No | Account deletion status. |
| `DELETE` | `/me` | User | Yes | Request account deletion. |
| `PATCH` | `/switch-role` | User | Yes | Switch active role. |
| `PATCH` | `/profile` | User | Yes | Update role profile. |
| `POST` | `/become-worker` | User | Yes | Add worker role/start worker onboarding. |
| `PATCH` | `/update-profile` | User | Yes | Update basic profile fields. |
| `PATCH` | `/onboarding` | User | Yes | Mark onboarding complete. |
| `PATCH` | `/locale` | User | Yes | Update preferred locale. |
| `POST` | `/forgot-password` | No | Yes | Send reset email if applicable. |
| `POST` | `/reset-password` | No | Yes | Reset password by token. |
| `POST` | `/verify-email` | No | Yes | Verify email by token. |
| `POST` | `/resend-verification` | No | Yes | Resend verification email. |
| `POST` | `/google` | No | Yes | Google ID token login. |

## Users - `/api/users`

See [admin-user-management.md](./admin-user-management.md).

| Method | Path | Auth | CSRF | Meaning |
| --- | --- | --- | --- | --- |
| `GET` | `/me/post-stats` | User | No | Current user's post stats. |
| `GET` | `/` | Admin | No | List users. |
| `POST` | `/` | Admin | Yes | Admin creates user. |
| `GET` | `/:id` | Admin | No | User detail. |
| `PUT` | `/:id` | Admin | Yes | Admin updates user. |
| `PATCH` | `/:id/status` | Admin | Yes | Change user status. |

Important:

- Full admin edit is intended for `created_by_admin` users.
- Worker creation can provision worker profile and worker services.

## Services - `/api/services`

Read-only service catalog routes.

| Method | Path | Auth | Meaning |
| --- | --- | --- | --- |
| `GET` | `/` | Public | Search/list services. |
| `GET` | `/:id` | Public | Service by id. |
| `GET` | `/code/:code` | Public | Service by code. |

The service catalog is seeded at backend startup.

## Worker Services - `/api/worker/services`

See [worker.md](./worker.md) and [multi-currency.md](./multi-currency.md).

| Method | Path | Auth | CSRF | Meaning |
| --- | --- | --- | --- | --- |
| `GET` | `/` | Worker | No | List current worker's service offerings. |
| `POST` | `/` | Worker | Yes | Create offering. |
| `PATCH` | `/:serviceId` | Worker | Yes | Update offering. |
| `DELETE` | `/:serviceId` | Worker | Yes | Delete offering. |

Pricing tier input:

```ts
{
  unit: "HOURLY" | "DAILY" | "MONTHLY";
  duration: number;
  price: number;
  currency: "VND" | "CNY" | "JPY" | "KRW" | "USD";
}
```

Backend computes `exchange_rate` and `price_vnd`.

## Workers - `/api/workers`

See [worker.md](./worker.md).

| Method | Path | Auth | CSRF | Meaning |
| --- | --- | --- | --- | --- |
| `GET` | `/location-suggestions` | Public | Location suggestions for discovery. |
| `GET` | `/grouped-by-service` | Optional | Discovery grouped by service. |
| `GET` | `/favorite-ids` | Client | No | Favorite worker ids. |
| `GET` | `/favorites` | Client | No | Favorite worker list. |
| `POST` | `/:id/favorite` | Client | No | Add favorite. |
| `DELETE` | `/:id/favorite` | Client | No | Remove favorite. |
| `GET` | `/me/blackouts` | Worker | No | List own blackouts. |
| `POST` | `/me/blackouts` | Worker | Yes | Create blackout. |
| `DELETE` | `/me/blackouts/:id` | Worker | Yes | Delete blackout. |
| `GET` | `/:id/suggestions` | Public | Suggested workers near a worker. |
| `GET` | `/:id/schedule` | Public | Worker schedule ranges. |
| `GET` | `/:id` | Optional | Worker profile. |

Discovery excludes inactive users, inactive services, moderation-restricted
workers, and profile-blocked workers where applicable.

## Worker Questions - `/api/worker-questions`

See [worker-question.md](./worker-question.md).

| Method | Path | Auth | CSRF | Meaning |
| --- | --- | --- | --- | --- |
| `POST` | `/` | Optional | Yes | Ask a worker (guest or registered); rate-limited (10/hour). |
| `GET` | `/worker/:workerId` | Optional | No | List a worker's questions, paginated and masked per viewer. |
| `POST` | `/:id/answer` | Worker | Yes | Worker answers (or edits the answer to) their own question. |

Private questions are masked (`question`/`answer` -> `***`) for viewers who are
neither the worker nor the original asker. The first answer notifies the asker
(registered users via in-app + email; guests via direct email).

## Bookings - `/api/bookings`

See [booking.md](./booking.md).

| Method | Path | Auth | Meaning |
| --- | --- | --- | --- |
| `POST` | `/quickbook` | Public | Create a guest booking (CSRF + rate-limited). |
| `GET` | `/lookup` | Public | Look up a guest booking by `public_ref` + `email`. |
| `POST` | `/` | User | Create booking. |
| `GET` | `/my` | User | List my bookings (accepts `is_guest` filter). |
| `GET` | `/admin/analytics` | Admin | Booking analytics. |
| `GET` | `/:id` | User | Booking detail. |
| `PATCH` | `/:id/status` | User | Status transition action. |
| `PATCH` | `/:id/cancel` | User | Cancel booking. |
| `PATCH` | `/:id` | User | Update editable booking fields. |
| `POST` | `/:id/dispute` | User | Create dispute. |
| `PATCH` | `/:id/dispute/resolve` | User/admin as allowed | Resolve dispute. |

Statuses:

```txt
pending
confirmed
in_progress
pending_client_acceptance
completed
cancelled
rejected
disputed
expired
```

Booking does not escrow or debit wallet funds.

Guest (quick) bookings use `POST /quickbook` (public, no `client_id`) and are
tracked via `GET /lookup` with the `public_ref` code plus the guest email.

## Reviews - `/api/reviews`

See [review.md](./review.md).

| Method | Path | Auth | Meaning |
| --- | --- | --- | --- |
| `POST` | `/` | User | Create review for completed booking. |
| `GET` | `/my` | User | List my reviews. |
| `GET` | `/all` | Admin | Admin list all reviews. |
| `GET` | `/stats/:workerId` | User | Review stats for worker. |
| `GET` | `/:id` | User | Review detail. |
| `PATCH` | `/:id` | User | Update own review. |
| `DELETE` | `/:id` | User | Delete own review/admin delete where allowed. |
| `POST` | `/:id/reply` | User | Worker reply. |

## Wallet - `/api/wallet`

See [wallet.md](./wallet.md).

| Method | Path | Auth | CSRF | Meaning |
| --- | --- | --- | --- | --- |
| `POST` | `/deposit/webhook` | SePay signature | No | SePay incoming payment webhook. |
| `GET` | `/deposit/webhook` | Public | No | Webhook health/check. |
| `POST` | `/deposit` | User | Yes | Create pending deposit and QR data. |
| `GET` | `/balance` | User | No | Wallet balance. |
| `GET` | `/transactions` | User | No | Transaction history. |
| `GET` | `/transactions/:transactionId` | User | No | Transaction detail. |

Admin wallet routes under `/api/admin/wallet`:

| Method | Path | Auth | Meaning |
| --- | --- | --- | --- |
| `GET` | `/transactions` | Admin | Transaction reporting. |
| `GET` | `/stats` | Admin | Wallet stats. |
| `GET` | `/top-users` | Admin | Top wallet users. |
| `GET` | `/chart` | Admin | Chart data. |

## Chat - `/api/chat`

See [chat.md](./chat.md).

All chat routes require authentication.

Direct chat:

| Method | Path | Meaning |
| --- | --- | --- |
| `POST` | `/messages` | Send direct message. |
| `GET` | `/messages` | List direct messages. |
| `GET` | `/conversations` | List direct conversations. |
| `GET` | `/conversations/:conversation_id` | Direct conversation detail. |
| `PATCH` | `/messages/read` | Mark direct messages read. |
| `GET` | `/messages/unread` | Direct unread count. |
| `DELETE` | `/messages/:message_id` | Delete direct message for requester. |

Group chat:

| Method | Path | Meaning |
| --- | --- | --- |
| `POST` | `/group/messages` | Send group message. |
| `GET` | `/group/messages` | List group messages. |
| `GET` | `/group/conversations` | List group conversations. |
| `GET` | `/group/conversations/:conversation_group_id` | Group detail. |
| `PATCH` | `/group/messages/read` | Mark group messages read. |
| `GET` | `/group/messages/unread` | Group unread count. |
| `POST` | `/group/complaint` | Create/open complaint group for disputed booking. |

Other:

| Method | Path | Meaning |
| --- | --- | --- |
| `GET` | `/admin-contact` | Return admin contact conversation target. |

## Notifications - `/api/notifications`

See [notification.md](./notification.md).

| Method | Path | Auth | Meaning |
| --- | --- | --- | --- |
| `GET` | `/` | User | List notifications. |
| `GET` | `/unread-count` | User | Unread count. |
| `GET` | `/preferences` | User | Read preferences. |
| `PATCH` | `/preferences` | User | Update preferences. |
| `GET` | `/push-public-key` | User | VAPID public key. |
| `POST` | `/push-subscriptions` | User | Save push subscription. |
| `DELETE` | `/push-subscriptions/:id` | User | Delete push subscription. |
| `PATCH` | `/read-all` | User | Mark all read. |
| `PATCH` | `/read-by-conversation` | User | Mark conversation notifications read. |
| `PATCH` | `/:id/read` | User | Mark one notification read. |

## Pricing - `/api/pricing`

See [pricing.md](./pricing.md).

| Method | Path | Auth | CSRF | Meaning |
| --- | --- | --- | --- | --- |
| `GET` | `/packages` | Public | No | Public active packages. |
| `GET` | `/me` | User | No | Current user's pricing state. |
| `POST` | `/upgrade` | User | Yes | Direct wallet upgrade. |
| `POST` | `/buy` | User | Yes | Create SePay QR pricing purchase. |
| `GET` | `/packages/admin` | Admin | No | List all packages. |
| `POST` | `/packages/admin` | Admin | No | Create package. |
| `GET` | `/packages/admin/:id` | Admin | No | Package detail. |
| `PATCH` | `/packages/admin/:id` | Admin | No | Update package. |
| `DELETE` | `/packages/admin/:id` | Admin | No | Delete package. |

Important:

- Package data comes from `PricingPackage`.
- Do not hard-code package price/features in client logic.
- Admin package mutations currently do not spread `csrfProtection` in
  `pricing.routes.ts`; add it there if package admin writes need the same CSRF
  posture as other admin modules.

## Social Feed

See [social-feed.md](./social-feed.md).

Posts - `/api/posts`:

| Method | Path | Auth | CSRF | Meaning |
| --- | --- | --- | --- | --- |
| `POST` | `/` | User | Yes | Create post. |
| `GET` | `/` | Optional | No | Feed. |
| `GET` | `/registered` | User | No | Posts current worker registered for. |
| `GET` | `/:id` | Optional | No | Post detail. |
| `PATCH` | `/:id` | User | Yes | Update post. |
| `DELETE` | `/:id` | User | Yes | Soft delete post. |
| `PATCH` | `/:id/comments-lock` | User | Yes | Lock/unlock comments. |
| `POST` | `/:id/registrations` | User | Yes | Toggle worker registration. |
| `GET` | `/:id/registrations` | User | No | List registrations for post author. |
| `GET` | `/:postId/comments` | Optional | No | List comments for post. |
| `POST` | `/:postId/comments` | User | Yes | Create comment. |

Comments - `/api/comments`:

| Method | Path | Auth | CSRF | Meaning |
| --- | --- | --- | --- | --- |
| `PATCH` | `/:id` | User | Yes | Update comment. |
| `DELETE` | `/:id` | User | Yes | Delete comment. |

Reactions - `/api/reactions`:

| Method | Path | Auth | CSRF | Meaning |
| --- | --- | --- | --- | --- |
| `GET` | `/summary` | User | No | Reaction summary. |
| `POST` | `/` | User | Yes | Upsert reaction. |
| `DELETE` | `/` | User | Yes | Remove reaction. |

Hashtags - `/api/hashtags`:

| Method | Path | Auth | Meaning |
| --- | --- | --- | --- |
| `GET` | `/trending` | Public | Trending hashtags. |

## Moderation - `/api/moderation`

See [moderation.md](./moderation.md).

All moderation routes require authentication. Admin subroutes require admin.

User routes:

| Method | Path | CSRF | Meaning |
| --- | --- | --- | --- |
| `GET` | `/blocks` | No | List own blocks. |
| `POST` | `/blocks` | Yes | Block user. |
| `DELETE` | `/blocks/:blocked_user_id` | Yes | Unblock user. |
| `POST` | `/reports/post` | Yes | Report post. |
| `GET` | `/reports/mine` | No | List own reports. |
| `GET` | `/reports/post/:post_id/open` | No | Current open post report. |
| `POST` | `/reports/worker` | Yes | Report worker. |
| `GET` | `/reports/worker/:worker_id/open` | No | Current open worker report. |

Admin routes:

| Method | Path | CSRF | Meaning |
| --- | --- | --- | --- |
| `GET` | `/admin/reports` | No | List reports. |
| `PATCH` | `/admin/reports/:id/status` | Yes | Update report status. |
| `GET` | `/admin/restrictions` | No | List restrictions. |
| `POST` | `/admin/restrictions` | Yes | Create restriction. |
| `PATCH` | `/admin/restrictions/:id/revoke` | Yes | Revoke restriction. |
| `DELETE` | `/admin/posts/:id` | Yes | Admin soft-delete post. |

## Reputation

See [reputation.md](./reputation.md).

User route under `/api/reputation`:

| Method | Path | Auth | Meaning |
| --- | --- | --- | --- |
| `GET` | `/history` | User | Current user's reputation history. |

Admin config under `/api/admin/reputation-config`:

| Method | Path | Auth | Meaning |
| --- | --- | --- | --- |
| `GET` | `/` | Admin | List config. |
| `PATCH` | `/:key` | Admin | Update config value. |

## Boost - `/api/boost` and `/api/admin/boost`

See [boost.md](./boost.md).

Worker routes:

| Method | Path | Auth | Meaning |
| --- | --- | --- | --- |
| `POST` | `/attendance` | Worker | Daily check-in. |
| `GET` | `/points` | Worker | Point wallet. |
| `POST` | `/activate` | Worker | Activate boost. |
| `GET` | `/status` | Worker | Active boost status. |

Admin routes:

| Method | Path | Auth | Meaning |
| --- | --- | --- | --- |
| `GET` | `/config` | Admin | Boost config. |
| `PUT` | `/config` | Admin | Update config. |
| `POST` | `/adjust-points` | Admin | Adjust worker points. |

## Admin and Ops

See [admin-ops.md](./admin-ops.md).

Feedback - `/api/feedback`:

| Method | Path | Auth | CSRF | Meaning |
| --- | --- | --- | --- | --- |
| `POST` | `/` | User | Yes | Submit feedback. |
| `GET` | `/mine` | User | No | Own feedback. |
| `GET` | `/admin` | Admin | No | Admin list. |
| `PATCH` | `/admin/:id/status` | Admin | Yes | Update status. |

Site settings - `/api/site-settings`:

| Method | Path | Auth | CSRF | Meaning |
| --- | --- | --- | --- | --- |
| `GET` | `/` | Public | No | Public settings. |
| `GET` | `/maintenance` | Public | No | Maintenance status. |
| `PATCH` | `/` | Admin | Yes | Partial update. |
| `POST` | `/reset` | Admin | Yes | Reset defaults. |

Email campaigns - `/api/admin/email-campaigns`:

| Method | Path | Auth | CSRF | Meaning |
| --- | --- | --- | --- | --- |
| `GET` | `/` | Admin | No | List campaigns. |
| `POST` | `/` | Admin | Yes | Create. |
| `GET` | `/:id` | Admin | No | Detail. |
| `PATCH` | `/:id` | Admin | Yes | Update. |
| `DELETE` | `/:id` | Admin | Yes | Delete. |
| `POST` | `/:id/send` | Admin | Yes | Send now. |
| `POST` | `/:id/cancel` | Admin | Yes | Cancel. |
| `GET` | `/:id/logs` | Admin | No | Send logs. |

Announcements:

| Prefix | Method | Path | Auth | CSRF | Meaning |
| --- | --- | --- | --- | --- | --- |
| `/api/announcements` | `GET` | `/by-placement` | User | No | Active announcements for placement. |
| `/api/admin/announcements` | `GET` | `/` | Admin | No | List. |
| `/api/admin/announcements` | `POST` | `/` | Admin | Yes | Create. |
| `/api/admin/announcements` | `GET` | `/:id` | Admin | No | Detail. |
| `/api/admin/announcements` | `PATCH` | `/:id` | Admin | Yes | Update. |
| `/api/admin/announcements` | `DELETE` | `/:id` | Admin | Yes | Delete. |

Dashboard:

| Prefix | Method | Path | Auth | Meaning |
| --- | --- | --- | --- | --- |
| `/api/admin/dashboard` | `GET` | `/analytics` | Admin | Dashboard aggregates. |

## WebSocket Events

Socket.IO uses authenticated connections.

Main event categories:

- direct message events,
- group message events,
- conversation read/update events,
- notification created/read/unread-count events.

Durable state is stored in MongoDB. Socket events are realtime delivery/update
signals.

## Common Error Areas

When debugging API failures, check:

- missing/expired auth cookie or bearer token,
- missing CSRF token on mutation,
- account status blocked by middleware,
- role mismatch (`adminOnly`, `workerOnly`, `clientOnly`),
- Zod validation error,
- ObjectId validation error,
- business-rule rejection in service layer,
- rate limiting.

## Maintenance Rule

When a route changes:

1. update this file,
2. update the relevant module memory doc,
3. update frontend service/hook types if the client consumes it.
