# Memory Bank - PR1AS Project Overview

## Product Summary

PR1AS is a full-stack platform that combines:

- a worker services marketplace,
- booking and schedule management,
- real-time direct and complaint chat,
- a SePay-backed wallet,
- worker subscription pricing and boosts,
- a social feed with registrations,
- moderation, reputation, reviews, and notifications,
- an admin dashboard for platform operations.

Main applications:

- Backend: `SERVER/` - Node.js, Express, TypeScript, MongoDB/Mongoose.
- Frontend: `pr1as-client/` - Next.js 16 App Router, React 19, TypeScript,
  shadcn/ui, Tailwind CSS.

## Repository Layout

```txt
PR1AS-RF/
  SERVER/
    src/
      app.ts              Express app, global middleware, route mount, errors
      index.ts            DB/socket/jobs/bootstrap
      config/             env, database, Socket.IO
      constants/          domain enums and shared constants
      controllers/        HTTP handlers by module
      jobs/               cron jobs
      middleware/         auth, CSRF, rate limiting, validation, errors
      models/             Mongoose schemas
      repositories/       data access and aggregations
      routes/             Express routers
      services/           business logic
      types/              shared TypeScript types
      utils/              response, AppError, jwt, logger, helpers
      validations/        Zod request schemas
  pr1as-client/
    app/                  Next.js App Router
    components/           UI and domain components
    services/             axios API clients
    lib/                  hooks, stores, utils, socket, currency, locale
    messages/             next-intl translations: en, vi, zh
    public/               assets and service worker
  docs/
  memorybank/
```

## Backend Request Architecture

```txt
HTTP request
  -> Express global middleware
  -> /api router
  -> route middleware: auth, role guard, CSRF, rate limit, validation
  -> controller
  -> service
  -> repository
  -> Mongoose/MongoDB
  -> response envelope
```

Cross-cutting backend systems:

- Socket.IO for chat and realtime notifications.
- node-cron jobs for expiration, reminders, recovery, reconciliation, and
  scheduled campaigns.
- Winston and Morgan for logging.
- `AppError` and response envelope helpers for predictable API errors.

## Frontend Architecture

```txt
User
  -> App Router route/page/layout
  -> domain component
  -> React Query hook or Zustand store
  -> service client
  -> backend API
```

Realtime:

```txt
socket.io-client
  -> chat events
  -> notification events
  -> React Query cache/store updates
```

Important client foundations:

- Server Components by default.
- Client Components only where state/effects/browser APIs are needed.
- TanStack Query for server state.
- Zustand for auth, currency, UI, and services header state.
- next-intl for `en`, `vi`, and `zh`.
- shadcn/ui and lucide icons for interface primitives.

## Authentication and Account Model

Auth supports:

- email/password registration with email verification,
- login with lockout protection,
- refresh token rotation with hashed refresh token storage,
- logout,
- Google ID token login,
- forgot/reset password,
- locale update,
- profile/basic profile update,
- onboarding completion,
- role switching,
- become-worker flow,
- pending account deletion with restore-on-login during grace period.

Token transport:

- HTTP-only cookies are set by the backend.
- Bearer tokens are also supported by auth middleware.
- Mutating routes use CSRF protection unless intentionally exempted.

Roles:

| Role | Meaning |
| --- | --- |
| `admin` | Platform administrator. |
| `worker` | Provides services. |
| `client` | Books workers and uses the client-facing app. |

Accounts can hold multiple roles. `last_active_role` controls active UI and
role-specific navigation.

See [auth.md](./auth.md) for detailed flows.

## Core Domain Collections

| Domain | Main collections |
| --- | --- |
| Auth/user | `user` |
| Worker | `worker_service`, worker profile embedded on user |
| Service catalog | service collection seeded at boot |
| Booking | `booking` |
| Review | `review` |
| Wallet | `wallet`, `wallet_transaction` |
| Pricing | `pricing_package`, `user_subscription_history` |
| Boost | worker point wallet/config collections |
| Chat | direct conversation/message, group conversation/message |
| Notification | `notification`, `notification_preference`, `push_subscription`, `notification_delivery_log` |
| Social feed | `post`, `comment`, `reaction`, `hashtag`, registration records |
| Moderation | `user_block`, `report`, `user_restriction` |
| Reputation | reputation history/config |
| Admin ops | `announcement`, `feedback`, `email_campaign`, `email_send_log`, `site_settings` |
| Jobs | `job_lock` |

## User Schema Summary

The user document owns identity, roles, status, profiles, and selected metadata.

Important fields:

| Field | Meaning |
| --- | --- |
| `email` | Unique lowercased email. |
| `password_hash` | Password hash; absent for Google-only users. |
| `google_id` | Partial-unique Google identity. |
| `full_name`, `phone`, `avatar` | Basic profile. |
| `roles` | Array of user roles. |
| `last_active_role` | Current role context. |
| `status` | Active/inactive/banned/pending-delete style account state. |
| `verify_email` | Email verification flag. |
| `created_by_admin` | Whether admin full-edit is allowed. |
| `deleted_at` | Soft delete timestamp. |
| `worker_profile` | Worker profile fields, gallery, work locations, introduction. |
| `client_profile` | Client-specific profile fields. |
| `meta_data.reputation_score` | Worker reputation score, default 100. |
| `meta_data.pricing_plan_code` | Current worker pricing plan. |
| `meta_data.pricing_started_at`, `pricing_expires_at` | Subscription period. |
| `meta_data.onboarding_done` | Onboarding flag. |
| `meta_data.locale` | Preferred locale. |

## Major User Workflows

### Worker Onboarding

1. User registers/logs in.
2. User chooses become-worker or starts worker setup.
3. Worker profile fields are completed.
4. Worker service offerings and pricing tiers are saved.
5. Backend validates active service catalog ids and computes VND price snapshots.
6. Worker becomes discoverable if user/profile/services/status gates pass.

See [worker.md](./worker.md) and [multi-currency.md](./multi-currency.md).

### Discovery and Booking

1. Client browses `/services` or a worker profile.
2. Worker discovery filters by active services, active worker status, moderation
   restrictions, location, schedule, category, reputation, and boost rank.
3. Client selects a worker service pricing unit and quantity.
4. Booking creation validates advance booking window, service availability,
   worker status, schedule conflict, and required booking fields.
5. Worker confirms or rejects.
6. Worker starts, marks done, then client accepts or disputes.
7. Completed bookings can receive reviews.

Booking is reservation-only. It does not escrow, debit, release, or refund wallet
money. See [booking.md](./booking.md).

### Pricing and Wallet

1. Pricing packages are read from database records.
2. Worker can upgrade directly from wallet balance or create a SePay QR purchase.
3. Wallet deposits create pending transactions with payment codes.
4. SePay webhook verifies signature and idempotently completes matching
   transactions.
5. Pricing QR payments trigger subscription upgrade after transaction success.
6. Expiration job downgrades expired paid plans.

See [pricing.md](./pricing.md) and [wallet.md](./wallet.md).

### Social Feed and Moderation

1. Client with enough reputation and package permissions creates a post.
2. Users can comment, react, follow hashtags, and workers can register interest.
3. Users can block, report posts, and report workers.
4. Admins review reports and can apply feature restrictions.
5. Restrictions are enforced in post creation and worker activity flows.

See [social-feed.md](./social-feed.md) and [moderation.md](./moderation.md).

## Mounted API Modules

All API routes are mounted under `/api`.

| Prefix | Module |
| --- | --- |
| `/csrf-token` | CSRF token issuance. |
| `/auth` | Authentication, profile, role switch, account lifecycle. |
| `/users` | Admin user management and self post stats. |
| `/services` | Read-only service catalog. |
| `/worker/services` | Worker service offerings and pricing tiers. |
| `/workers` | Worker discovery, favorites, blackouts, schedule. |
| `/chat` | Direct and group/complaint chat. |
| `/wallet` | User wallet and SePay deposit webhook. |
| `/admin/wallet` | Admin wallet reporting. |
| `/admin/dashboard` | Admin analytics. |
| `/bookings` | Booking lifecycle and disputes. |
| `/reviews` | Booking reviews and worker replies. |
| `/notifications` | Notifications, preferences, push subscriptions. |
| `/pricing` | Pricing packages, current plan, upgrade/buy. |
| `/posts`, `/comments`, `/hashtags`, `/reactions` | Social feed. |
| `/moderation` | Blocks, reports, restrictions, admin moderation. |
| `/reputation`, `/admin/reputation-config` | Reputation history and config. |
| `/feedback` | User feedback and admin triage. |
| `/site-settings` | Public settings and admin updates. |
| `/admin/email-campaigns` | Admin email campaigns. |
| `/announcements`, `/admin/announcements` | Placement announcements and admin CRUD. |
| `/boost`, `/admin/boost` | Worker boosts and admin boost config. |

See [api-reference.md](./api-reference.md) for route details.

## Background Jobs

Started in `SERVER/src/index.ts` after DB connection, index sync, default
reputation config seed, and service catalog seed.

| Job | Purpose |
| --- | --- |
| `booking-expiration.job.ts` | Expire stale pending bookings. |
| `booking-reminder.job.ts` | Send upcoming booking reminders. |
| `reputation-recovery.job.ts` | Gradually recover reputation. |
| `moderation-resolution-notify.job.ts` | Dispatch deferred worker report resolution notices. |
| `plan-expiration.job.ts` | Downgrade expired pricing subscriptions. |
| `account-deletion.job.ts` | Purge accounts past deletion grace period. |
| `wallet-reconciliation.job.ts` | Reconcile wallet balances and transaction totals. |
| `email-campaign.job.ts` | Start due scheduled email campaigns. |

`job-lock` coordinates scheduled work across instances.

## Internationalization

- Frontend locales: `en`, `vi`, `zh`.
- Translation files: `pr1as-client/messages/*.json`.
- Backend stores preferred locale in `user.meta_data.locale`.
- `PATCH /api/auth/locale` updates authenticated user preference.
- Notification event service localizes notification text using recipient locale.

## Multi-Currency

Supported display currencies:

- `VND`
- `CNY`
- `JPY`
- `KRW`
- `USD`

VND is the source/pivot for platform money. Worker service prices additionally
store original input currency and exchange-rate snapshot.

See [multi-currency.md](./multi-currency.md).

## Frontend Routes

Selected routes:

| Area | Routes |
| --- | --- |
| Public | `/`, `/services`, `/posts`, `/pricing`, `/privacy`, `/terms`, `/cookies`, `/booking-process` |
| Auth | `/(auth)/login`, `/(auth)/register`, `/(auth)/reset-password`, `/(auth)/verify-email` |
| Client | `/client/profile`, `/client/bookings`, `/client/chat`, `/client/wallet`, `/client/favorites`, `/client/blocked` |
| Worker | `/worker/setup`, `/worker/[id]`, `/worker/bookings`, `/worker/bookings/schedule`, `/worker/boost` |
| Shared auth | `/chat`, `/notifications`, `/settings`, `/wallet` |
| Admin | `/dashboard` and dashboard subroutes |
| Ops | `/maintenance`, `/offline` |

## Development

Backend:

```bash
cd SERVER
npm install
npm run dev
```

Frontend:

```bash
cd pr1as-client
npm install
npm run dev
```

On this Windows setup, use `npm.cmd`/`npx.cmd` from automation when PowerShell
execution policy blocks `npm.ps1`.

## Key Environment Variables

Backend:

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

Feature-specific backend env:

- SMTP/Nodemailer settings for email.
- Web Push VAPID keys for push notifications.
- Google OAuth client id for Google login.
- SePay bank/webhook settings for wallet and pricing QR payments.

Frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Security Model

- JWT access token plus refresh token rotation.
- Refresh token hash stored server-side.
- HTTP-only cookies for browser auth.
- CSRF token required on mutating protected routes.
- Role middleware on server routes.
- Rate limits on auth, token, email, booking create, chat send, and complaint
  paths.
- Zod validation for request bodies/query where available.
- Sanitization for rich user content.
- Moderation blocks/restrictions enforced inside service logic, not only UI.

## Source of Truth

The source code is authoritative. If this memory bank conflicts with code:

1. follow the code,
2. update the memory bank,
3. update the matching module docs and API reference together.
