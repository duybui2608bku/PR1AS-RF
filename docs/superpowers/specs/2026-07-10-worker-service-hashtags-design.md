# Worker-Service Hashtags & Hashtag Search — Design Spec

**Date:** 2026-07-10
**Status:** Approved (design phase)
**Author:** brainstorming session

## Problem

When a worker sets up their profile, each service offering (a `WorkerService`)
carries only pricing. Workers cannot describe their specialization within a
service, and clients cannot discover workers by niche keywords. We want workers
to attach free-text **hashtags** to each service offering (e.g. service #4 →
`IT`, `HR`), and clients to **search a hashtag** and get back the worker
profiles that carry it on any of their offerings.

## Decisions (locked during brainstorming)

- **Granularity:** hashtags live per `WorkerService` offering (per worker+service).
- **Input:** free-text, normalized server-side. No autocomplete, no controlled list.
- **Search surface:** a dedicated hashtag search box → a **flat list of worker
  profiles** (deduped across their offerings).
- **Matching:** partial **contains** (query `it` matches `it`, `it_support`).
- **Public display:** worker's public profile shows the hashtags under each service.
- **Storage approach (A):** `hashtags: string[]` directly on `WorkerService`;
  regex-contains search. No shared `Hashtag` collection (that module stays
  post-only).

## Current Architecture (verified)

- **`WorkerService`** — [SERVER/src/models/worker/worker-service.ts](../../../SERVER/src/models/worker/worker-service.ts)
  + [SERVER/src/types/worker/worker-service.ts](../../../SERVER/src/types/worker/worker-service.ts):
  `worker_id`, `service_id`, `service_code`, `pricing[]`, `is_active`. No hashtags.
- **Upsert flow** — `workerServiceRepository.upsertManyForWorker(workerId, payloads)`
  where `UpsertWorkerServicePayload = { serviceId, serviceCode, pricing }`
  ([SERVER/src/repositories/worker/worker-service.repository.ts](../../../SERVER/src/repositories/worker/worker-service.repository.ts)).
- **Public profile** — `worker.service.ts getWorkerProfile` maps `services`
  from `workerServiceRepository.findAllForWorker` (currently `service_id`,
  `service_code`, `pricing`).
- **Routes** — `/api/workers/*` (worker.routes.ts, incl. `grouped-by-service`);
  `/api/worker/services/*` (worker-service CRUD). Mounted in
  [SERVER/src/routes/index.ts](../../../SERVER/src/routes/index.ts).
- **Existing hashtag module (posts only)** — normalized `Hashtag` collection,
  `PostHashtag` join, `HASHTAG_LIMITS` (max 50 chars). We reuse the
  normalization idea and limits shape, **not** the collection.
- **Frontend** — worker setup wizard `app/worker/setup/page.tsx` (services step
  keyed by `selectedPricing`); `worker-profile.service.ts` (`getMyWorkerServices`,
  `upsertWorkerServices`); public profile services in
  `components/worker/worker-services.tsx`; discovery in
  `components/home/home-search-experience.tsx`.

## Design

### 1. Data model

Add to `WorkerService` (`IWorkerService` + schema):

- `hashtags: string[]` — default `[]`. Stored **normalized** (see §2).

**Constants** (new, e.g. `SERVER/src/constants/worker-service.ts` or extend an
existing worker constants file):

- `WORKER_SERVICE_HASHTAG_LIMITS = { MAX_PER_SERVICE: 10, MAX_LENGTH: 50 }`.

**Index:** `workerServiceSchema.index({ hashtags: 1 })` (multikey — assists
anchored/equality lookups; a `$regex` contains scan still runs but the index
narrows nothing for unanchored patterns — acceptable per the contains decision).

### 2. Hashtag normalization

A pure helper `normalizeHashtag(raw: string): string | null`:

1. Trim, strip a leading `#`.
2. Lowercase.
3. Keep only `[\p{L}\p{N}_]` and convert internal whitespace/`-` to `_`.
4. Reject (return `null`) if empty after cleaning or longer than `MAX_LENGTH`.

`normalizeHashtags(raw: string[]): string[]` maps + filters nulls + dedupes,
caps at `MAX_PER_SERVICE`. Applied server-side on every write; the client may
pre-normalize for display but the server is the source of truth.

Storage is normalized-only; the UI renders `#<tag>` (e.g. `#it`). Preserving
original casing is out of scope (YAGNI).

### 3. Setup / edit flow (writing hashtags)

**Backend:**

- `UpsertWorkerServicePayload` gains `hashtags?: string[]`.
- `upsertManyForWorker` writes `hashtags: normalizeHashtags(item.hashtags ?? [])`
  on each upserted offering.
- Zod validation for the upsert body: each service item's `hashtags` is an
  optional `string[]`, each element a non-empty string ≤ `MAX_LENGTH` before
  normalization, array length ≤ `MAX_PER_SERVICE`. (Server still re-normalizes.)
- `findAllForWorker` / the `/worker/services` GET returns `hashtags` per
  offering so the edit form can prefill.

**Frontend (`app/worker/setup/page.tsx` services step):**

- A parallel state map `serviceHashtags: Map<serviceId, string[]>` alongside
  `selectedPricing`, seeded from `getMyWorkerServices` on load.
- Each selected service (that has pricing) renders a **chip-input**: type a tag
  + Enter to add, `×` to remove; enforce ≤10 chips, trim/normalize on add,
  ignore duplicates. A small reusable `HashtagChipInput` component.
- `buildServicesPayload` includes `hashtags` per item; `WorkerServiceUpsertItem`
  + `upsertWorkerServices` body carry `hashtags`.

### 4. Hashtag search (reading)

**Endpoint:** `GET /api/workers/search-by-hashtag?q=<text>&page=&limit=` (public).

- Zod query: `q` required non-empty (trimmed); `page`/`limit` optional with the
  app's pagination defaults (reuse `getPagination`).
- Service normalizes `q` the same way as stored tags (lowercase, strip `#`),
  then escapes it with `escapeRegExp` (existing util).

**Repository (aggregation on `WorkerService`):**

1. `$match { is_active: true, hashtags: { $regex: <escaped>, $options: "i" } }`.
2. `$lookup` `Service` on `service_id`; `$unwind`; `$match { "service.is_active": true }`
   (deprecated services excluded, consistent with existing discovery).
3. `$lookup` `User` (worker) on `worker_id`; `$unwind`;
   `$match { "worker.status": ACTIVE, "worker.roles": WORKER }`.
4. `$group` by `worker_id` → one row per worker; collect the union of matched
   `hashtags` (only those matching `q`) and a light services summary.
5. Sort (e.g. reputation desc, then created), `$facet` for `data` + `total`,
   paginate via `$skip`/`$limit`.
6. Project a **worker card**: `id`, `full_name`, `avatar`, `worker_profile`
   subset (`introduction`, `gallery_urls`, `work_locations`), `reputation_score`,
   `matched_hashtags: string[]`.

Returns `{ data: WorkerHashtagCard[], pagination: { page, limit, total, totalPages } }`.

### 5. Public profile display

`getWorkerProfile`'s `services` mapping adds `hashtags` per service. The public
profile component `components/worker/worker-services.tsx` renders the hashtags as
small chips (`#it`, `#hr`) under each service's pricing. `WorkerServiceItem` FE
type + any profile DTO type gain `hashtags: string[]`.

### 6. Frontend search UI

- A dedicated **hashtag search box** in the discovery area (home /
  `home-search-experience.tsx` or a new `app/workers/search` route) that calls
  the endpoint via a new hook `useWorkerHashtagSearch(q, page)` (TanStack Query;
  query key under `queryKeys.workers`).
- Results render as a **flat grid of worker cards**, reusing the existing worker
  card presentation used by favorites/suggestions where practical, with the
  `matched_hashtags` shown on each card. Empty state + loading + pagination.
- Debounce the query input; only fire when `q` is non-empty.

## Edge Cases

- **Empty / whitespace-only `q`** → validation error (or empty result); do not
  scan for an empty regex.
- **Regex-special characters in `q`** → escaped via `escapeRegExp`; never
  interpolated raw.
- **Worker offers the tag on a deprecated service only** → excluded (step 2
  filters `service.is_active`).
- **Duplicate/near-duplicate tags on one offering** → deduped at normalization.
- **Worker inactive/banned** → excluded (step 3).
- **Same tag on multiple offerings of one worker** → worker appears once
  (group/dedupe in step 4).

## Testing

**Backend (jest, service + pure-helper layers):**

- `normalizeHashtag` / `normalizeHashtags`: strips `#`, lowercases, converts
  spaces/`-` to `_`, drops empties, dedupes, caps length and count, rejects
  over-length.
- Upsert writes normalized hashtags (mock repo) and enforces the cap.
- Search service (mock repo): normalizes + escapes `q`; returns deduped
  worker cards; excludes inactive workers and deprecated-service-only matches;
  paginates with a correct `total`.

**Frontend:** `npm run typecheck` + manual — chip input add/remove/limit;
search box returns cards; profile shows tags. (Client has no test runner.)

## Out of Scope

- Shared hashtag vocabulary / trending / autocomplete for worker tags.
- Preserving original hashtag casing.
- Multi-hashtag / boolean search (single query string only).
- Denormalizing tags onto the `User` document for indexed search (future
  optimization if contains-scan becomes a bottleneck).
- Admin moderation of worker hashtags.
