# Memory Bank - PR1AS

The Memory Bank is the working documentation set for the PR1AS repository. It
captures the architecture, module flows, API contracts, persistence rules, and
known implementation nuances that are easy to lose when reading only the UI.

All documents are written in English. Code, route names, enum values, and field
names stay exactly as they appear in the project.

## Repository Layout

```txt
PR1AS-RF/
  SERVER/          Backend: Express, TypeScript, MongoDB/Mongoose
  pr1as-client/    Frontend: Next.js App Router, React, shadcn/ui
  docs/            User-facing or generated docs
  memorybank/      This memory bank
```

Important current facts:

- The frontend is `pr1as-client/`, not `CLIENT/`.
- The UI stack is shadcn/ui, Radix primitives, Tailwind CSS, and lucide icons.
- Booking is a reservation/scheduling workflow, not an escrow/payment workflow.
- Pricing packages are database-backed through `PricingPackage`, not hard-coded
  UI constants.
- VND is the base currency for platform money; display currency is a preference.

## Core Documents

- [project-overview.md](./project-overview.md): product scope, architecture,
  domain map, jobs, environment, and development workflow.
- [backend.md](./backend.md): backend layering, middleware, routes, jobs,
  persistence conventions, auth/security, and module ownership.
- [frontend.md](./frontend.md): Next.js structure, providers, state, service
  clients, route groups, i18n, currency, realtime, and UI conventions.
- [api-reference.md](./api-reference.md): REST API routes grouped by mounted
  backend module.

## Module Documents

- [auth.md](./auth.md): registration, login, refresh/logout, Google auth, role
  switch, account deletion, cookies, and security.
- [admin-user-management.md](./admin-user-management.md): admin-created users,
  worker service provisioning, status changes, and editable account rules.
- [worker.md](./worker.md): worker profile, services, pricing tiers, discovery,
  favorites, blackouts, schedule, and frontend surfaces.
- [booking.md](./booking.md): create flow, advance booking rules, status machine,
  cancellation, disputes, complaint chat, reviews, notifications, and known
  scheduling nuances.
- [pricing.md](./pricing.md): database-backed pricing packages, worker
  subscription state, direct wallet upgrade, SePay QR purchase, expiration, and
  admin package management.
- [wallet.md](./wallet.md): wallet balance, transactions, SePay deposits,
  pricing QR payments, webhook idempotency, reconciliation, and admin analytics.
- [chat.md](./chat.md): direct chat, complaint group chat, authorization, read
  states, Socket.IO events, and notification behavior.
- [notification.md](./notification.md): durable in-app notifications, channel
  dispatch, preferences, push subscriptions, delivery logs, and event facade.
- [social-feed.md](./social-feed.md): posts, comments, reactions, hashtags,
  post registrations, create limits, moderation hooks, and pricing gates.
- [moderation.md](./moderation.md): user blocks, post/worker reports, admin
  report review, feature restrictions, deferred worker resolution notices, and
  enforcement points.
- [review.md](./review.md): completed-booking review creation, update/delete,
  worker replies, stats, low-review side effects, and schema nuance.
- [reputation.md](./reputation.md): score storage, config cache, deductions,
  warnings, history, and daily recovery.
- [boost.md](./boost.md): point wallet, attendance, boost activation, discovery
  ranking, admin config, and frontend hard-coded cost/duration nuance.
- [multi-currency.md](./multi-currency.md): supported currencies, VND pivot,
  worker service price snapshots, display conversion, and drift handling.
- [site-header.md](./site-header.md): standard header, services header, portal
  search form, role menu, preferences, notifications, and mobile nav.
- [admin-ops.md](./admin-ops.md): announcements, feedback, email campaigns,
  site settings, and dashboard analytics.

## How To Use These Docs

For a new task:

1. Start with the relevant module document.
2. Check [api-reference.md](./api-reference.md) for route shape.
3. Check [backend.md](./backend.md) or [frontend.md](./frontend.md) for local
   implementation conventions.
4. Treat source code as authoritative when a doc and code disagree.

For a module change:

1. Update the route/controller/service/model as needed.
2. Update matching frontend service/hook/UI types.
3. Update the module memory document.
4. Update [api-reference.md](./api-reference.md) if route or payload contracts
   changed.
5. Update [project-overview.md](./project-overview.md) only if the platform map,
   jobs, or major feature scope changed.

## Documentation Standards

- Prefer exact source paths and enum values.
- Document flows, conditions, side effects, and known caveats, not only feature
  names.
- Avoid hard-coding business facts that are loaded from the database.
- Keep user-facing workflows aligned with the actual API, not a desired design.
- Use ASCII text in this folder unless a source identifier requires otherwise.
