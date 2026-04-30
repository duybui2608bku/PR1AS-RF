# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test runner is configured. TypeScript checking: `npx tsc --noEmit`.

## Environment

```
NEXT_PUBLIC_API_URL=http://localhost:3052/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3052  # optional, derived from API URL if absent
```

## Architecture

**Stack**: Next.js 16 App Router, React 19, TypeScript (strict), SCSS Modules + Tailwind 4, Ant Design 6, TanStack Query 5, Zustand 5, Socket.IO, i18next, Zod, Axios.

**Directory layout**:
- `app/` — Next.js pages and route-specific components. Each route segment has its own `components/` and `constants/` subfolders.
- `lib/` — Everything shared: `api/`, `axios/`, `components/`, `constants/`, `hooks/`, `providers/`, `socket/`, `stores/`, `types/`, `utils/`.
- `styles/` — Global SCSS: `_variables.scss` (design tokens), `_reset.scss`.
- `messages/` — i18n JSON files: `vi` (default), `en`, `ko`, `zh`.

**Path alias**: `@/` maps to the project root.

## Auth & Role System

Auth state lives in Zustand (`lib/stores/auth.store.ts`), persisted to the `auth-storage` cookie. JWT access token and refresh token are stored in `localStorage`. The Axios interceptor (`lib/axios/config.ts`) attaches `Authorization: Bearer <token>` and auto-refreshes on 401 via the `/auth/refresh-token` endpoint. Mutating requests (POST/PATCH/PUT/DELETE) also fetch and attach a CSRF token.

Three roles: `client`, `worker`, `admin`. The active role is `user.last_active_role`. Next.js middleware (`middleware.ts`) redirects workers who visit `/client/*` to either `/worker/setup` (no profile) or `/worker/:id`.

Use `<AuthGuard>` (`lib/components/auth-guard.tsx`) to protect client-side routes.

## API & Data Fetching

All API calls go through `axiosInstance` (`lib/axios/`). API modules live in `lib/api/*.api.ts`. Use `buildEndpoint(ApiEndpoint.X, { id })` from `lib/constants/api-endpoints.ts` to construct URLs with path params.

**Preferred hooks**:
- `useApiQueryData<T>(key, url)` — query that unwraps `data` from the response envelope.
- `useStandardizedMutation(fn, options)` — wraps `useMutation` with automatic error notification via `useErrorHandler`. **All mutations must use this hook**, not raw `useMutation`.
- `useApiMutation(url, method)` — generic URL-based mutation; callers must specify `invalidateQueries` target in `onSuccess` themselves.

The `ApiResponse<T>` envelope shape: `{ success, statusCode, data?, message?, error? }`.

## Real-time / Socket

A singleton Socket.IO client is managed in `lib/socket/config.ts` via `getSocket()`. It authenticates with the JWT from `localStorage` and reconnects on `auth:token-refreshed` custom events. Use `lib/hooks/use-socket.ts` in components.

## Styling

- SCSS modules per component (co-located, e.g. `header.module.scss`).
- Global design tokens in `styles/_variables.scss`: primary brand color `#711111`, dark/light backgrounds and text variables.
- Fonts: Work Sans and Outfit (loaded via `next/font`).
- Design language: Airbnb-inspired minimalism, Bento Grid layout, Swiss style. No heavy gradients or neumorphism.
- Theme (dark/light) state in `lib/stores/theme.store.ts`.

## i18n

`i18n/config.ts` initialises i18next with browser language detection, falling back to Vietnamese (`vi`). Import `useTranslation` from `react-i18next` in client components. Translation keys are in `messages/*.json`. Admin UI supports `vi`/`en` only; user-facing UI supports all four locales.

## Layout

`MainLayout` (`app/components/main-layout.tsx`) wraps all non-admin pages with Header + CategoryTabs + Content + Footer. Admin routes (`/admin/*`) bypass it entirely. Chat routes (`/chat/*`) suppress CategoryTabs and Footer.

## Shared Hooks

| Hook | Location | Purpose |
|---|---|---|
| `useMobile()` | `lib/hooks/use-mobile.ts` | Responsive breakpoint (< 768 px) |
| `usePagination()` | `lib/hooks/use-pagination.ts` | `page`, `limit`, `handleTableChange`, `resetPage` |
| `useStandardizedMutation` | `lib/hooks/use-standardized-mutation.ts` | Mutation with auto error handling |
| `useErrorHandler` | `lib/hooks/use-error-handler.ts` | Surface API errors as notifications |
| `useSocket` | `lib/hooks/use-socket.ts` | Access singleton socket |
