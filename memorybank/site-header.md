# Memory Bank - Site Header and Mobile Navigation

## Purpose

`SiteHeader` is the shared top navigation for the public/client/worker app. It
also owns the special expandable services search header on `/services`, exposes
role-aware navigation, shows notification and preference controls, and mirrors
mobile header visibility into UI state.

Primary source files:

- Header: `pr1as-client/components/layout/site-header.tsx`
- Mobile preferences: `pr1as-client/components/layout/mobile-prefs-sheet.tsx`
- Notification bell: `pr1as-client/components/layout/notification-bell.tsx`
- Services header store:
  `pr1as-client/lib/store/services-header-store.ts`
- UI store: `pr1as-client/lib/store/ui-store.ts`
- Role route helpers: `pr1as-client/lib/navigation/role-routes.ts`
- Home search experience:
  `pr1as-client/components/home/home-search-experience.tsx`
- Home hero/search slot: `pr1as-client/components/hero/home-hero.tsx`
- Mobile bottom nav: `pr1as-client/components/layout/mobile-bottom-nav.tsx`

## Standard Header Mode

Used on all routes except `/services`.

Responsibilities:

- Show brand name/logo from site settings, falling back to static site config.
- Link the logo to the active role's default route.
- Show public nav tabs for guests where applicable.
- Show authenticated actions:
  - role switch,
  - preferences,
  - notifications,
  - user menu,
  - logout.
- Hide/reveal on mobile scroll.

Brand source:

1. `useSiteSettings()` loads settings from the backend.
2. `brandName` uses `siteSettings.name` or `siteConfig.name`.
3. `brandLogo` uses `siteSettings.logoUrl` when present.

## User Menu

Menu definitions live in `USER_MENU_ITEM_DEFS`.

Base items:

| Key | Default href | Notes |
| --- | --- | --- |
| `chat` | `/chat` | Shared chat entry. |
| `posts` | `/posts` | Social feed. |
| `favorites` | `/client/favorites` | Client role only. |
| `profile` | `/client/profile` | Worker active role resolves to `/worker/:userId`. |
| `settings` | `/settings` | Shared settings. |
| `schedule` | `/worker/bookings/schedule` | Worker role only. |
| `wallet` | `/wallet` | Shared wallet. |
| `booking` | `/booking` | Role-route helper resolves final route. |
| `pricing` | `/pricing` | Label is current pricing plan code. |

Role route resolution:

- `getRoleRoute(routeKey, activeRole, fallbackHref)` maps shared route keys to
  client/worker destinations.
- `getRoleDefaultRoute(activeRole)` controls where the logo sends the user.
- Worker profile uses `/worker/:id` when the active role is worker.

## Role Switching

Switch flow:

1. If unauthenticated, user is routed to login.
2. If switching from client to worker and the account does not have the worker
   role, route to `/worker/setup`.
3. Otherwise call `PATCH /api/auth/switch-role`.
4. Update auth store with the returned user.
5. Route to the default destination for the new active role.

Important:

- Active role uses `last_active_role` when present.
- `roles` is the source for whether the account already owns worker access.
- Client-side navigation is convenience only; backend route guards still enforce
  role access.

## Session Restore Before Login

Login click behavior:

1. The header attempts `/api/auth/session` restore when needed.
2. If restore fails, it clears the frontend session cookie and pushes login.

This prevents unnecessary logout-like behavior when the backend session still
exists but the local auth store has not hydrated.

## Preferences

Preferences are shown in:

- desktop avatar popover,
- mobile preferences sheet,
- guest header switcher where relevant.

Preference types:

- theme,
- language/locale,
- currency.

Implementation notes:

- Preferences use the shared `PrefsPanel`.
- Currency uses the global currency store and persists to cookie/localStorage.
- Locale updates should stay aligned with `next-intl` and
  `PATCH /api/auth/locale` for authenticated users.

## Notifications

`NotificationBell` is rendered in the header for authenticated users.

It integrates with:

- `/api/notifications/unread-count`,
- `/api/notifications`,
- Socket.IO notification events,
- notification read mutations.

See [notification.md](./notification.md) for backend behavior.

## Services Header Mode

Used when `pathname === "/services"`.

Constants:

- `EXPAND_THRESHOLD = 40`
- `COLLAPSE_THRESHOLD = 120`

Two visual states:

| State | Trigger | UI |
| --- | --- | --- |
| Expanded | top of page or manual expand | Two rows: nav tabs plus search/filter slot. |
| Collapsed | scrolled beyond threshold | Single row with compact search pill. |

Tabs:

- `ASSISTANCE` with `Briefcase` icon.
- `COMPANIONSHIP` with `HeartHandshake` icon.

The active tab is sourced from `useServicesHeaderStore`.

## Services Header Store

File: `pr1as-client/lib/store/services-header-store.ts`.

Fields:

| Field | Meaning |
| --- | --- |
| `activeTab` | Current service tab: `ASSISTANCE` or `COMPANIONSHIP`. |
| `selectedLocationLabel` | Compact pill location label. |
| `scheduledAtLabel` | Compact pill schedule label. |
| `switchTabCallback` | Callback registered by the home search experience. |
| `isHeaderExpanded` | Expanded/collapsed state. |
| `filterSlotEl` | DOM node where the desktop filter form is portaled. |

Writers:

- `SiteHeader` writes `isHeaderExpanded` and `filterSlotEl`.
- `HomeSearchExperience` writes active tab, labels, and tab-switch callback.

Readers:

- `SiteHeader` reads labels, tab state, callback, and expanded state.
- `HomeHero` reads `filterSlotEl` and portals the form.

## Portal Search Form

The desktop services filter form is owned by the page-level home search
experience but rendered into the sticky header.

Flow:

1. `SiteHeader` renders a `filterSlotRef` in row 2.
2. `useLayoutEffect` saves `filterSlotRef.current` to the services header store.
3. `HomeHero` reads `filterSlotEl`.
4. `HomeHero` uses `createPortal(desktopForm, filterSlotEl)`.

Why:

- The sticky header needs to contain the filter form in the DOM for layout and
  animation.
- Search state remains owned by the page-level search experience.

## Scroll and Manual Expand Logic

Automatic behavior:

- near top: expanded,
- scroll down past collapse threshold: collapsed,
- scroll back above expand threshold: expanded.

Manual behavior:

1. User clicks compact pill.
2. `isManuallyExpandedRef.current = true`.
3. Header expands in place without scrolling to top.
4. Click outside collapses it.
5. Radix popover/portal clicks are ignored so menus do not instantly collapse
   the header.

Implementation detail:

- A ref is kept alongside React state because scroll listeners can close over
  stale state.

## Mobile Behavior

Header:

- auto-hides on scroll down,
- reappears on scroll up,
- mirrors hidden state to UI store.

Services page:

- desktop tab nav and filter slot are hidden on mobile.
- mobile search/tabs live in page content instead of the header portal.

Mobile bottom nav:

- Hidden on dashboard/auth pages.
- Guest tabs include home/posts/login.
- Authenticated worker tabs include posts/chat/bookings/me.
- Authenticated client tabs include home/posts/chat/me.
- More sheet includes profile, notifications, favorites, schedule, boost,
  wallet, bookings, settings, pricing, preferences, and logout where applicable.

## Related Module Interactions

- Auth: role switch, session state, logout.
- Notifications: unread bell and realtime events.
- Site settings: brand name/logo.
- Pricing: current plan badge in the user menu.
- Multi-currency: currency preference control.
- Services discovery: search filter portal and service tab state.

## Checklist When Editing Header

- Keep role route resolution in `role-routes.ts` rather than hard-coding every
  path inside the header.
- Keep `/services` behavior separate from the standard header.
- Preserve mobile auto-hide state if changing scroll listeners.
- Do not break Radix popover click-outside exceptions.
- Keep preferences shared between desktop and mobile surfaces.
- Verify guest, client, worker, and admin-like authenticated states separately.
