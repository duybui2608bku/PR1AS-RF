# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

PR1AS is a full-stack platform combining a worker/companionship services marketplace, a social posts feed, and an admin dashboard. It is a two-app repo:

- **`SERVER/`** — Node.js + Express + TypeScript + MongoDB (Mongoose). REST API + Socket.IO, port `3000`.
- **`pr1as-client/`** — Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + shadcn/ui. Dev server on port `3001` (server owns 3000; `CORS_ORIGIN` defaults to `http://localhost:3001`).

`memorybank/` contains detailed, per-domain documentation. Start with [memorybank/project-overview.md](memorybank/project-overview.md) and the relevant domain file (e.g. `booking.md`, `wallet.md`, `chat.md`) before deep work. Note: the memory bank can lag the code — verify specific claims against source.

## Session log

[SESSIONS.md](SESSIONS.md) is a cross-session work log. **At the start of a session, read it** (newest entry on top) to learn what previous sessions changed, decided, and left unfinished. **After making changes, append a new entry** to the top following the template in that file. Keep entries short — what changed and why, plus any leftover work; do not duplicate what `git log` already records.

## Commands

### Backend (`SERVER/`)
```bash
npm run dev            # ts-node-dev hot-reload, src/index.ts
npm run build          # tsc → dist/
npm start              # node dist/index.js
npm run lint           # eslint src --ext .ts   (lint:fix to autofix)
npm run format         # prettier --write
npm test               # jest (ts-jest). No spec files exist yet; tests match **/*.(spec|test).ts under src/
npm run backfill:pricing-vnd   # one-off data migration script
```
Run a single test once specs exist: `npx jest path/to/file.test.ts` or `npx jest -t "name"`.

### Frontend (`pr1as-client/`)
```bash
npm run dev            # next dev --turbopack
npm run build          # next build
npm run lint           # eslint
npm run typecheck      # tsc --noEmit   (run this to validate types; build does not block on TS the same way)
npm run format         # prettier --write
```

Each app has its own `package.json` and `node_modules`; `npm install` separately in each.

## Backend architecture

Strict layered flow, organized **by domain module** inside each layer (`auth`, `booking`, `wallet`, `chat`, `post`, `moderation`, `reputation`, `pricing`, `boost`, etc.):

```
Request → routes/ → middleware (auth / csrf / rateLimit / validation)
        → controllers/ → services/ → repositories/ → models/ (Mongoose) → MongoDB
```

- **Adding a feature** means touching the same module folder across layers: `routes/<module>` → `controllers/<module>` → `services/<module>` (business logic lives here) → `repositories/<module>` (all DB access) → `models/<module>`. Request shapes are validated with **Zod** schemas in `validations/`. Enums/constants per domain live in `constants/`.
- All routes mount under `/api` via [SERVER/src/routes/index.ts](SERVER/src/routes/index.ts) — this is the canonical API surface map.
- HTTP responses go through the `R` helper (`utils/response`); use it rather than calling `res.json` directly.
- `src/index.ts` is the bootstrap: connects DB, `syncAllIndexes()`, seeds defaults (reputation config, services), starts all cron jobs, mounts Socket.IO, and wires graceful shutdown. `src/app.ts` builds the Express app.

### Cross-cutting concerns
- **Auth**: JWT access + refresh with rotation; refresh-token hash stored on the user. Tokens travel in HTTP-only cookies and/or `Authorization: Bearer`. Roles are an array (`ADMIN`/`WORKER`/`CLIENT`) with `last_active_role`; a single account switches active role. Middleware shortcuts: `adminOnly`, `workerOnly`, `clientOnly`.
- **CSRF**: state-changing requests require a token from `GET /api/csrf-token`.
- **Realtime**: Socket.IO (`config/socket.ts`) with authenticated handshake — chat (direct + group) and notifications.
- **Background jobs** (`src/jobs/`, node-cron): booking expiration/reminders, plan expiration, reputation recovery, account-deletion purge, wallet reconciliation, email campaigns, moderation-resolution notifications. Cross-instance concurrency is guarded by a `job-lock` model — preserve that guard when adding jobs.
- **Logging**: Winston (`utils/logger`).

## Frontend architecture

Next.js App Router. Data and state conventions:
- **Server state**: TanStack Query. Hooks in `lib/hooks/use-*.ts` wrap query/mutation logic; query keys are centralized in `lib/query-keys.ts`. API calls go through axios clients in `services/` (shared instance in `lib/axios.ts`).
- **Client state**: Zustand stores in `lib/store/`.
- **Realtime**: `socket.io-client` via `lib/chat-socket.ts` and `lib/hooks/use-chat-socket.ts`.
- **Routing/auth**: `middleware.ts` handles locale + auth gating; role-based route maps in `lib/navigation/`.
- UI primitives are shadcn/ui (Radix-based) under `components/`.

## Invariants (do not break)

- **Multi-currency**: VND is the pivot/base. All stored amounts are normalized to VND; the display layer converts using hard-coded snapshot rates. Source of truth is `SERVER/src/constants/currency.ts`, **mirrored** in `pr1as-client/lib/currency.ts` — change both together. Active currencies: VND, CNY, JPY, KRW, USD.
- **i18n**: Active locales `en` (default), `vi`, `zh`. Per-user locale lives in `meta_data.locale` (`PATCH /api/auth/locale`); frontend uses `next-intl` with `pr1as-client/messages/{locale}.json`. Add keys to all three locale files.
- **Payments**: the wallet/top-up gateway is **SePay** (VNPay was removed — do not reintroduce it).
- **User-generated rich content** must be sanitized with `sanitize-html` before storage/render.

## Conventions (from `.cursor/rules/`)

- **Commits**: Conventional Commits — `<type>[scope]: <description>`, imperative mood, no trailing period. Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`.
- **Frontend style**: no semicolons; Tailwind classes only (no inline `<style>`/CSS files); early returns; `const` arrow functions with types; event handlers prefixed `handle*` (`handleClick`, `handleKeyDown`); include accessibility attributes.
- **Backend**: async/await throughout; MVC-style layering as described above.

Both `tsconfig` files run `strict`. The backend also enforces `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch` — keep imports and params clean or the build fails.
