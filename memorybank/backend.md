# Memory Bank - Backend

## Overview

The PR1AS backend is an Express and TypeScript API backed by MongoDB through
Mongoose. It owns authentication, worker marketplace logic, bookings, wallet and
SePay integration, pricing packages, boosts, chat, notifications, social feed,
moderation, reputation, reviews, and admin operations.

Primary entry points:

- `SERVER/src/app.ts`
- `SERVER/src/index.ts`
- `SERVER/src/routes/index.ts`

## Directory Structure

```txt
SERVER/
  src/
    app.ts              Express app factory
    index.ts            server bootstrap and graceful shutdown
    config/             env, database, Socket.IO
    constants/          enums and domain constants
    controllers/        HTTP controllers
    jobs/               node-cron jobs
    middleware/         auth, CSRF, rate limit, validation, errors
    models/             Mongoose schemas
    repositories/       data access
    routes/             Express routers
    scripts/            boot/backfill/seed scripts
    services/           business logic
    types/              TypeScript domain types
    utils/              response, AppError, logger, jwt, helpers
    validations/        Zod schemas
  dist/
  logs/
```

## Runtime Bootstrap

`SERVER/src/index.ts` performs startup in this order:

1. Load env through `dotenv/config`.
2. Create Express app.
3. Create HTTP server.
4. Initialize Socket.IO on the HTTP server.
5. Connect MongoDB.
6. Sync Mongoose indexes.
7. Seed default reputation config.
8. Seed service catalog.
9. Start cron jobs.
10. Listen on configured port.

On `SIGTERM` or `SIGINT`, the server stops jobs, closes HTTP server, closes DB,
and exits.

## Express App

`SERVER/src/app.ts` configures:

- Helmet security headers and CSP/HSTS options from config.
- CORS with credentials and configured origins/methods.
- JSON parser with `rawBody` capture for webhook signature verification.
- URL-encoded parser.
- cookie-parser.
- input sanitization middleware.
- compression.
- Morgan request logging.
- `GET /health`.
- `/api` route mount.
- not-found and error handlers.

Important:

- `rawBody` exists because SePay webhook signature verification needs the exact
  request body.
- `/health` is outside `/api`.

## Layering Pattern

Most modules follow this stack:

```txt
routes -> middleware -> controller -> service -> repository -> model
```

Layer responsibilities:

| Layer | Responsibility |
| --- | --- |
| Routes | Path definitions and route-specific middleware. |
| Middleware | Authentication, role guard, CSRF, rate limit, validation, pagination. |
| Controllers | Translate HTTP request/response to service calls. |
| Services | Business rules, status machines, notifications, side effects. |
| Repositories | Queries, writes, aggregations. |
| Models | Mongoose schema, indexes, transforms. |

Rules:

- Keep business decisions in services, not controllers.
- Use repositories for repeated data access.
- Use Zod validation for route input when available.
- Mutations that change protected state should use CSRF unless intentionally
  exempted.
- Role/security checks must exist server-side.

## API Mounts

Mounted in `SERVER/src/routes/index.ts`:

| Mount | Module |
| --- | --- |
| `/csrf-token` | CSRF token issuance. |
| `/auth` | Authentication and account lifecycle. |
| `/users` | Admin user management and self post stats. |
| `/services` | Service catalog reads. |
| `/worker/services` | Worker service offerings. |
| `/workers` | Worker discovery, favorites, blackouts, schedule. |
| `/chat` | Direct and group chat. |
| `/wallet` | User wallet and SePay webhook. |
| `/admin/wallet` | Admin wallet reporting. |
| `/admin/dashboard` | Dashboard analytics. |
| `/bookings` | Booking lifecycle and disputes. |
| `/reviews` | Reviews and worker replies. |
| `/notifications` | Notification center, preferences, push. |
| `/pricing` | Pricing packages and subscription purchase. |
| `/posts` | Social feed posts and registrations. |
| `/comments` | Comment update/delete. |
| `/hashtags` | Hashtag discovery. |
| `/reactions` | Reaction summary/upsert/remove. |
| `/moderation` | Blocks, reports, restrictions. |
| `/reputation` | User reputation history. |
| `/admin/reputation-config` | Admin reputation config. |
| `/feedback` | Feedback and admin triage. |
| `/site-settings` | Public/admin site settings. |
| `/admin/email-campaigns` | Admin email campaigns. |
| `/announcements` | Placement announcements. |
| `/admin/announcements` | Admin announcement CRUD. |
| `/boost` | Worker boost operations. |
| `/admin/boost` | Admin boost config. |

See [api-reference.md](./api-reference.md).

## Authentication Middleware

Auth middleware accepts:

- `Authorization: Bearer <token>`,
- access token cookie.

Core middleware:

| Middleware | Meaning |
| --- | --- |
| `authenticate` | Requires a valid active user. |
| `optionalAuthenticate` | Adds user context when a token is valid. |
| `authorize(...roles)` | Requires a role. |
| `adminOnly` | Admin role shortcut. |
| `workerOnly` | Worker role shortcut. |
| `clientOnly` | Client role shortcut. |

Important behavior:

- Mutating methods re-check fresh account status.
- Safe reads can use JWT snapshot where middleware allows.
- Client route guards are not a security boundary.

See [auth.md](./auth.md).

## CSRF

Route:

```txt
GET /api/csrf-token
```

The response returns the token in the configured response header and body.
Protected mutations spread `...csrfProtection`.

Common CSRF-protected mutations:

- auth login/register/logout/token/account/profile mutations,
- wallet deposit,
- pricing upgrade/buy/package admin mutations,
- worker blackout create/delete,
- post/comment/reaction mutations,
- moderation block/report/admin mutations,
- admin announcements/email/settings/user mutations.

Webhook routes such as SePay webhook do not use user CSRF and instead use
signature verification.

## Rate Limiting

Configured in `SERVER/src/middleware/rateLimiter.ts`.

Notable limiters:

- `authLimiter`
- `refreshTokenLimiter`
- `emailActionLimiter`
- `tokenActionLimiter`
- `tokenAttemptLimiter`
- `bookingCreateLimiter`
- `chatSendLimiter`
- `groupComplaintLimiter`
- `adminContactLimiter`
- `postCreateLimiter`

When adding high-impact public or user-triggered mutation routes, check whether
an existing limiter applies.

## Response Envelope

All controllers should return through `R.success`/`R.error`.

Shape:

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

Production should not expose stack traces.

## Error Handling

Use:

- `AppError` for expected domain errors,
- `asyncHandler` around async controllers,
- `errorHandler` as final Express middleware,
- `notFoundHandler` for unknown routes.

Avoid throwing generic `Error` for user-facing validation/business failures when
an `AppError` or module error code exists.

## Database and Indexes

Database:

- MongoDB through Mongoose.
- Connection setup in `SERVER/src/config/database.ts`.
- Index sync runs at startup.

Schema rules:

- Keep important uniqueness and query indexes in schemas.
- Use partial unique indexes for optional unique fields.
- Put schedule/conflict guard indexes close to the owning model.
- For append/audit history, prefer insert-only records rather than mutating old
  history rows.

Examples:

- Booking has schedule/status indexes and a partial unique index for active
  worker/start-time collisions.
- Notification has TTL cleanup and partial dedupe index.
- Wallet transactions use partial uniqueness for SePay transaction ids.
- Pricing package code is the source for subscription plans.

## Background Jobs

Started in `index.ts`:

| Job | Module | Purpose |
| --- | --- | --- |
| `booking-expiration.job.ts` | Booking | Expire stale pending bookings. |
| `booking-reminder.job.ts` | Booking | Upcoming booking reminders. |
| `reputation-recovery.job.ts` | Reputation | Daily/periodic score recovery. |
| `moderation-resolution-notify.job.ts` | Moderation | Deferred worker report resolution notifications. |
| `plan-expiration.job.ts` | Pricing | Downgrade expired subscriptions. |
| `account-deletion.job.ts` | Auth | Purge accounts after deletion grace period. |
| `wallet-reconciliation.job.ts` | Wallet | Compare wallet balances and ledger totals. |
| `email-campaign.job.ts` | Admin ops | Start due scheduled campaigns. |

Use job locks where duplicate execution across instances would be harmful.

## Socket.IO

Configured in:

- `SERVER/src/config/socket.ts`
- `SERVER/src/config/socket.handlers.ts`

Main usages:

- direct chat rooms,
- group/booking complaint rooms,
- notification delivery,
- unread-count updates,
- online/disconnect handling for admin/user status side effects.

Service code emits through the socket layer but should keep durable state in
MongoDB first.

## Payments and Wallet

Wallet deposits use SePay QR/bank transfer.

Important backend rules:

- `rawBody` is captured before parsing effects matter.
- Webhook signature is verified before transaction lookup/update.
- Webhook completion is idempotent.
- Amount mismatch marks transaction failed and sends notification.
- Successful pricing QR payments call pricing upgrade asynchronously with an
  idempotency key.

There is no booking escrow or automatic booking payment release. Booking does
not debit wallet balance.

See [wallet.md](./wallet.md) and [booking.md](./booking.md).

## Pricing

Pricing packages are database-backed:

- model: `PricingPackage`,
- public route: `/api/pricing/packages`,
- admin routes: `/api/pricing/packages/admin*`,
- current user route: `/api/pricing/me`,
- purchase routes: `/api/pricing/upgrade` and `/api/pricing/buy`.

Do not hard-code package prices/features in docs, services, or client business
logic when the database is the source.

See [pricing.md](./pricing.md).

## Multi-Currency

Backend source: `SERVER/src/constants/currency.ts`.

Rules:

- VND is platform base currency.
- Worker service pricing stores original currency and VND snapshot.
- Backend computes `exchange_rate` and `price_vnd`.
- Wallet, SePay, pricing packages, and boost point operations stay VND/source
  units; frontend may convert for display.

See [multi-currency.md](./multi-currency.md).

## Validation

Validation files live in `SERVER/src/validations/<module>/`.

Use Zod for:

- body shape,
- query shape,
- enum values,
- limits/lengths,
- date constraints,
- ObjectId string format where applicable.

Some older/admin modules validate inline in controllers. When extending those,
prefer preserving local style unless extracting validation improves clarity.

## Coding Conventions

- Files: kebab-case.
- Classes/types: PascalCase.
- Functions/variables: camelCase.
- Constants/enums: UPPER_SNAKE_CASE or enum-style constants matching existing
  module style.
- Re-export from module `index.ts` when a module already follows that pattern.
- Keep route paths and payload fields stable unless migration is intentional.
- Add comments only where the rule is non-obvious.

## Scripts

From `SERVER/`:

```bash
npm run dev
npm run build
npm start
npm run lint
npm run format
npm run format:check
npm run backfill:pricing-vnd
npm test
```

On Windows automation, prefer `npm.cmd`.

## Environment

Core:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017
DB_NAME=pr1as
JWT_SECRET=...
JWT_EXPIRE=15m
JWT_REFRESH_SECRET=...
JWT_REFRESH_EXPIRE=7d
CORS_ORIGIN=http://localhost:3001
```

Feature-specific:

- SMTP/Nodemailer values for email.
- VAPID keys for web push.
- Google OAuth client id.
- SePay bank account/name/webhook secret.
- CORS/security tuning values.

## Backend Change Checklist

- Add or update route in the correct module router.
- Confirm `routes/index.ts` mount if adding a new module.
- Add auth/role/CSRF/rate limit middleware.
- Validate request inputs.
- Keep service-layer business rules authoritative.
- Add/update model indexes for new query or uniqueness requirements.
- Emit notifications through notification event service when relevant.
- Update client service/hook types when API contracts change.
- Update module memory doc and [api-reference.md](./api-reference.md).
