# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a monorepo with three separate applications:

```
PR1AS-RF/
├── SERVER/          # Express + TypeScript + MongoDB backend (port 3000)
├── CLIENT/          # Next.js 16 full-featured frontend (port 3001) — has its own CLAUDE.md
├── pr1as-client/    # Next.js 16 newer client (shadcn/ui, Radix, Tailwind 4)
└── memorybank/      # Architecture docs in Vietnamese (source of truth for design decisions)
```

The `CLIENT/` directory has its own `CLAUDE.md` with detailed guidance — read it when working in that app.

---

## SERVER

### Commands (run from `SERVER/`)

```bash
npm run dev          # Hot-reload dev server (ts-node-dev)
npm run build        # Compile TypeScript → dist/
npm start            # Run compiled output
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier write
npm test             # Jest
```

### Environment (`SERVER/.env`)

```
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017
DB_NAME=pr1as
JWT_SECRET=
JWT_EXPIRE=15m
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRE=7d
CORS_ORIGIN=http://localhost:3001
FRONTEND_URL=http://localhost:3001
EMAIL_ACCOUNT=
GOGGLE_APP_PASSWORD=
```

### Architecture

**Request pipeline**: Routes → Middleware (auth/validation) → Controllers → Services → Repositories → Mongoose Models

- **Controllers** (`src/controllers/`) — HTTP layer only. Use `asyncHandler` wrapper and return responses via `R.success()` / `R.error()`.
- **Services** (`src/services/`) — All business logic. No HTTP imports.
- **Repositories** (`src/repositories/`) — All Mongoose queries live here; services never call Mongoose directly.
- **Validations** (`src/validations/`) — Zod schemas applied as middleware before controllers.
- **Jobs** (`src/jobs/`) — `booking-expiration.job.ts` runs on a cron via `node-cron`, started in `index.ts`.
- **Socket** (`src/config/socket.ts` + `socket.handlers.ts`) — Socket.IO initialized on the HTTP server, shares auth middleware.

Domain modules (routes/controllers/services/repositories all follow the same set): `auth`, `booking`, `chat`, `comment`, `dashboard`, `escrow`, `hashtag`, `notification`, `post`, `pricing`, `reaction`, `review`, `service`, `user`, `wallet`, `worker`.

**Auth**: JWT access token (15 m) + refresh token (7 d, hashed in DB). `authenticate` middleware validates bearer token on protected routes. Passwords hashed with bcrypt.

**Logging**: Winston (`src/utils/logger.ts`), files written to `logs/`.

---

## pr1as-client

This is a newer Next.js client being built alongside `CLIENT/`. It uses shadcn/ui + Radix UI instead of Ant Design, and has a simpler feature set.

### Commands (run from `pr1as-client/`)

```bash
npm run dev        # Turbopack dev server
npm run build      # Production build
npm start          # Production server
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm run format     # Prettier write
```

### Environment (`pr1as-client/.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api   # falls back to this if unset
```

### Architecture

**Stack**: Next.js 16 App Router, React 19, TypeScript (strict), Tailwind 4, shadcn/ui + Radix UI, TanStack Query 5, Zustand 5, Socket.IO client, Axios, `date-fns`, Sonner (toasts).

**Path alias**: `@/` maps to the project root.

**Directory layout**:
- `app/` — Next.js pages. Routes: `(auth)`, `chat`, `client`, `dashboard`, `posts`, `pricing`, `services`, `wallet`, `worker`.
- `components/` — Shared UI components grouped by domain (`auth`, `chat`, `hero`, `home`, `layout`, `post`, `pricing`, `providers`, `ui`, `wallet`, `worker`).
- `lib/` — Core shared code: `auth/`, `hooks/`, `store/`, `utils/`, `axios.ts`, `constants.ts`, `query-client.ts`, `query-keys.ts`.
- `services/` — API service modules (one file per domain, e.g. `booking.service.ts`).
- `config/` — `site.ts` (site metadata, nav links), `nav.ts`.

**Auth**: Cookie-based. `AUTH_COOKIE_NAME` and `ACTIVE_ROLE_COOKIE_NAME` set after login. Axios interceptor (`lib/axios.ts`) reads token from Zustand store and sets `Authorization: Bearer`. On 401, store is cleared and user is redirected to `/login`.

**Middleware** (`middleware.ts`): Protects `/client`, `/chat`, `/posts`, `/dashboard`. Redirects unauthenticated users to `/login`. Workers visiting `/` are redirected to `/posts`.

**State**: `lib/store/auth-store.ts` (Zustand, persisted to `auth-storage` cookie).

**API calls**: Use the `api` axios instance from `lib/axios.ts`. Service modules in `services/` wrap endpoints. TanStack Query for caching; query keys centralized in `lib/query-keys.ts`.
