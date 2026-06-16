# Memory Bank - Frontend

## Overview

`pr1as-client/` is a Next.js 16 App Router application using React 19,
TypeScript, shadcn/ui, Radix primitives, Tailwind CSS, TanStack Query, Zustand,
next-intl, axios, and socket.io-client.

The frontend is not a standalone source of business truth. It reads and mutates
through the backend API and should mirror backend constraints without replacing
server-side authorization or validation.

## Directory Structure

```txt
pr1as-client/
  app/
    (auth)/              login, register, reset, verify
    api/                 Next route handlers/proxy helpers where needed
    booking-process/     public booking guide
    chat/                shared chat route
    client/              client profile, bookings, wallet, favorites, blocked
    cookies/             public policy
    dashboard/           admin dashboard
    maintenance/         maintenance page
    notifications/       notification center
    offline/             offline page
    posts/               social feed
    pricing/             subscription pricing page
    privacy/             public policy
    services/            worker discovery/search
    settings/            user settings
    terms/               public policy
    wallet/              shared wallet
    worker/              worker profile, setup, bookings, schedule, boost
    layout.tsx
    template.tsx
    page.tsx
    globals.css
  components/
    ui/                  shadcn/ui primitives
    layout/              header, footer, mobile nav, sheets
    auth/
    booking/
    chat/
    dashboard/
    hero/
    home/
    post/
    pricing/
    wallet/
    worker/
    announcement/
    providers/
  services/              axios API clients by backend module
  lib/
    hooks/               React Query and UI hooks
    store/               Zustand stores
    auth/
    navigation/
    worker/
    home/
    vn-provinces/
    axios.ts
    chat-socket.ts
    currency.ts
    locale.ts
    query-client.ts
    query-keys.ts
    site-settings-server.ts
  messages/              en.json, vi.json, zh.json
  public/                assets and service worker
  types/
  middleware.ts
```

## Main Stack

| Area | Libraries |
| --- | --- |
| Framework | Next.js 16 App Router, React 19 |
| Language | TypeScript |
| UI | shadcn/ui, Radix, Tailwind CSS, lucide-react |
| Server state | TanStack Query |
| Client state | Zustand |
| HTTP | axios |
| Realtime | socket.io-client |
| i18n | next-intl |
| Auth helpers | jose in middleware, backend cookies |
| Rich text | TipTap, react-markdown, remark-gfm |
| Dates | date-fns, react-day-picker |
| Toasts | sonner |
| Theme | next-themes |

## Routing Model

Key route groups:

| Area | Routes |
| --- | --- |
| Public | `/`, `/services`, `/posts`, `/pricing`, `/privacy`, `/terms`, `/cookies`, `/booking-process` |
| Auth | `/(auth)/login`, `/(auth)/register`, `/(auth)/reset-password`, `/(auth)/verify-email` |
| Client | `/client/profile`, `/client/bookings`, `/client/wallet`, `/client/favorites`, `/client/blocked` |
| Worker | `/worker/setup`, `/worker/[id]`, `/worker/bookings`, `/worker/bookings/schedule`, `/worker/boost` |
| Shared auth | `/chat`, `/notifications`, `/settings`, `/wallet` |
| Admin | `/dashboard` and dashboard subroutes |
| Ops | `/maintenance`, `/offline` |

`middleware.ts` handles locale/auth gating. Server API routes still enforce real
authorization.

## Providers

Provider composition lives under `components/providers/`.

Expected provider responsibilities:

- Query client.
- Theme.
- i18n context from Next/next-intl.
- Auth/session hydration.
- Currency hydration.
- Socket/notification effects where applicable.
- Error boundary wrappers.

Avoid adding ad hoc top-level providers unless the state is genuinely global.

## API Client

File: `pr1as-client/lib/axios.ts`.

Rules:

- Base URL uses `NEXT_PUBLIC_API_URL`, defaulting to backend `/api` in local dev.
- `withCredentials` is enabled for backend cookies.
- Request interceptor attaches CSRF for mutating requests.
- Response interceptor handles common error surfacing and session expiry.
- Service files in `pr1as-client/services/` should wrap endpoints.

Response envelope:

```ts
interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
}
```

## Service Clients

Current service files include:

- `auth.service.ts`
- `user.service.ts`
- `service.service.ts`
- `worker.service.ts`
- `worker-profile.service.ts`
- `booking.service.ts`
- `review.service.ts`
- `wallet.service.ts`
- `admin-wallet.service.ts`
- `pricing.service.ts`
- `boost.service.ts`
- `chat.service.ts`
- `notification.service.ts`
- `post.service.ts`
- `post-registration.service.ts`
- `comment.service.ts`
- `reaction.service.ts`
- `hashtag.service.ts`
- `moderation.service.ts`
- `reputation.service.ts`
- `reputation-config.service.ts`
- `announcement.service.ts`
- `feedback.service.ts`
- `email-campaign.service.ts`
- `dashboard.service.ts`
- `site-settings.service.ts`

Use these clients from hooks/components instead of raw axios calls unless there
is a clear local precedent.

## Hooks

Hooks live mainly in `pr1as-client/lib/hooks/`.

Patterns:

- React Query hooks wrap service clients for server state.
- Mutation hooks invalidate exact query keys.
- UI hooks handle viewport, click-outside, sockets, currency, and local browser
  behavior.
- Keep query keys centralized in `lib/query-keys.ts` when possible.

Important hooks by domain:

- auth: `use-auth.ts`
- worker/discovery/setup: worker hooks and setup hooks
- booking: `use-bookings.ts`
- wallet: `use-wallet.ts`
- chat: `use-chat.ts`, `use-chat-socket.ts`
- notifications: `use-notifications.ts`
- feed: `use-posts.ts`, `use-comments.ts`, `use-reactions.ts`
- pricing/boost/reputation/moderation/admin ops: matching domain hooks

## Zustand Stores

Important stores:

| Store | Meaning |
| --- | --- |
| `auth-store.ts` | Current user, auth loaded flag, session state. |
| `auth-dialog-store.ts` | Login/register dialog visibility. |
| `currency-store.ts` | Selected display currency, cookie/localStorage persistence. |
| `services-header-store.ts` | `/services` header/search portal state. |
| `ui-store.ts` | Shared UI state such as mobile header visibility. |

Use Zustand for client-only cross-component state. Use React Query for data that
comes from the backend.

## Authentication Frontend Flow

1. Login/register/Google calls backend auth endpoints.
2. Backend sets HTTP-only cookies.
3. Client stores returned user in `auth-store`.
4. Axios sends cookies with requests.
5. Next middleware and role helpers guide navigation.
6. Backend middleware remains authoritative.
7. Logout clears backend cookies and local auth state.

Role switching:

- Header calls the auth switch-role mutation.
- If a client lacks worker role, switching to worker routes to `/worker/setup`.
- Role default routes come from `lib/navigation/role-routes.ts`.

See [auth.md](./auth.md) and [site-header.md](./site-header.md).

## Internationalization

Locales:

- `en`
- `vi`
- `zh`

Rules:

- User-visible text should use next-intl messages.
- Translation files live in `messages/*.json`.
- Authenticated locale changes should update backend `meta_data.locale`.
- Notification text is localized backend-side, so frontend should render the
  provided title/body rather than re-translating notification payloads.

## Multi-Currency Frontend

Files:

- `lib/currency.ts`
- `lib/store/currency-store.ts`
- `lib/hooks/use-currency.ts`

Rules:

- The selected currency is a display/input preference.
- Platform money source values remain VND.
- Worker setup inputs use selected currency, but backend recomputes VND
  snapshots.
- Public displays should format source VND values through `formatMoney`.
- Wallet and SePay operations must submit VND amounts.

See [multi-currency.md](./multi-currency.md).

## Site Header

The shared header:

- reads branding from site settings,
- resolves role-aware menu links,
- supports role switching,
- shows preferences,
- shows notification bell,
- hides on mobile scroll,
- changes into an expandable services header on `/services`.

The `/services` filter form is portaled from page content into the header slot.

See [site-header.md](./site-header.md).

## Worker Setup

Worker setup collects:

- profile details,
- work locations,
- gallery and introduction,
- services,
- pricing tiers.

Important:

- Service ids must come from active backend service catalog values.
- Pricing uses selected currency for input but backend computes `price_vnd`.
- Existing unchanged pricing rows are preserved to avoid rounding drift.
- Worker role/onboarding/profile state should stay aligned with auth response.

See [worker.md](./worker.md).

## Booking Frontend

Main surfaces:

- create dialog: `components/worker/book-worker-dialog.tsx`,
- client booking pages under `app/client/bookings/*`,
- worker booking pages under `app/worker/bookings/*`.

UI must reflect backend status machine:

- create pending booking,
- worker confirm/reject,
- worker start,
- worker mark complete into pending client acceptance,
- client accept or dispute,
- participant/admin cancellation rules,
- admin dispute resolution.

Do not add wallet payment behavior to booking UI unless the backend booking
module is explicitly changed.

See [booking.md](./booking.md).

## Realtime

Socket client:

- `pr1as-client/lib/chat-socket.ts`

Realtime surfaces:

- direct chat,
- group/complaint chat,
- notifications,
- unread counts.

State updates should keep durable backend data as source of truth. Socket events
should update query caches and visible UI, not replace persistence.

## Admin Dashboard

Dashboard pages use:

- admin route guards,
- domain-specific service clients,
- admin-only backend endpoints,
- dashboard hooks and table components.

Important admin modules:

- users,
- bookings/disputes,
- transactions/wallet,
- pricing packages,
- reputation config,
- moderation reports/restrictions,
- announcements,
- email campaigns,
- feedback,
- site settings,
- dashboard analytics.

Server-side admin checks are still required on all admin endpoints.

## UI Conventions

- Use existing shadcn/ui primitives from `components/ui/`.
- Use lucide icons for actions.
- Use domain folders for feature components.
- Avoid hard-coded visible copy; add translations.
- Keep cards for repeated items, modals, or genuinely framed tools.
- Preserve existing page structure for small feature changes.
- Prefer dense, operational dashboard layouts over marketing-style pages for
  admin/productivity views.

## Error Handling

- Route-level error UI: `app/error.tsx`.
- Global error UI: `app/global-error.tsx`.
- API errors surface through axios interceptor and `sonner`.
- Domain mutations can show more specific toasts when useful.
- Keep backend error messages/codes as the primary contract.

## Performance Notes

- Keep Server Components as default.
- Add `"use client"` only when needed.
- Use React Query caching and invalidation.
- Dynamically load heavy editor/cropper/chart components when appropriate.
- Use `next/image` for image rendering.
- Avoid global state for data that belongs in query cache.

## Scripts

From `pr1as-client/`:

```bash
npm run dev
npm run build
npm start
npm run lint
npm run format
npm run typecheck
```

On Windows automation, prefer `npm.cmd`.

## Frontend Change Checklist

- Use existing service client and hook patterns.
- Keep backend contracts and enum values exact.
- Add translations for visible text.
- Preserve CSRF-aware mutation path through shared axios.
- Invalidate/query-update exact React Query keys after mutations.
- Keep role navigation in role helper files where possible.
- Verify guest/client/worker/admin states when editing shared layout.
- Update module docs and [api-reference.md](./api-reference.md) for contract
  changes.
