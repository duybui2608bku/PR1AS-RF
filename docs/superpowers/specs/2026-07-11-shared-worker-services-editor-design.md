# Shared Worker Services Editor (admin form ≡ worker setup) — Design Spec

**Date:** 2026-07-11
**Status:** Approved (design phase)
**Author:** brainstorming session

## Problem

The admin "create/edit user" form (`user-create-form.tsx`) has a **"Dịch vụ & Giá"**
section that is a near-duplicate of the worker-setup services step, but it:

- renders a **flat list** of services (no VIRTUAL/PHYSICAL split), and
- has **no per-service hashtag input**.

The worker-setup services step groups services into **Trợ lý ảo (VIRTUAL)** /
**Trợ lý thực tế (PHYSICAL)** and has a `HashtagChipInput` per service. Admins
must get the **identical** experience. Chosen approach: **extract the
worker-setup services step into one shared, controlled component and reuse it in
both places** (removes the existing duplication).

## Current Architecture (verified)

- **Worker setup** (`app/worker/setup/page.tsx`): state `selectedPricing:
  Map<serviceId, WorkerPricingSlot[]>` (VND canonical) + `priceDrafts:
  Map<`${serviceId}:${unit}:${currency}`, string>` + `serviceHashtags:
  Map<serviceId, string[]>`. Uses `useCurrency()`, `convertVndTo`/`convertToVnd`/
  `formatAmountInput` (`@/lib/currency`), `@/lib/worker/worker-setup-pricing`
  helpers (`buildPricingFromUnits`, `normalizeWorkerPricingSlots`,
  `priceForUnit`, `WORKER_SETUP_PRICING_SLOT_ORDER`), and
  `splitServicesByCategory`/`isServiceIncludedInWorkerSetupStep`
  (`@/lib/worker/worker-setup-catalog`). Inline `renderServiceRow`, `toggleService`,
  `setPriceForUnit`. Submit builds `WorkerServiceUpsertItem[]` via
  `buildServicesPayload` using `originalPricingRef` to avoid VND↔currency drift.
- **Admin form** (`components/dashboard/user-create-form.tsx`): state
  `draft.services: DraftService[]` where `DraftService = { service_code, prices:
  { HOURLY; DAILY; MONTHLY } }` (VND strings). Already uses `useCurrency`,
  `convertVndTo`, `formatAmountInput`, and its own `priceDrafts` keyed
  `${code}:${unit}:${currency}`. Renders a flat `catalog.map`. Submit
  (`buildWorkerPayload`) → `worker_services: [{ service_code, pricing }]` (VND,
  duration 1). Edit prefill maps `detail.worker_services` → `DraftService[]`.
  Has a sample/random-data helper (`SAMPLE_SERVICE_SETS`) for test data.
- **Backend admin path**: `AdminCreateUserSchema.worker_services` items =
  `{ service_code, pricing }` (no hashtags). `userService.resolveWorkerServices`
  builds upsert payloads and calls `workerServiceRepository.upsertManyForWorker`
  (its `UpsertWorkerServicePayload.hashtags` is already optional — defaults to
  `[]`). `normalizeHashtags` exists (`utils/worker-hashtag`).

## Design

### 1. Shared component `WorkerServicesEditor`

New file `pr1as-client/components/worker/worker-services-editor.tsx`. **Controlled**
(parent owns the canonical state):

**Props:**
- `catalog: ServiceItem[]` — active services.
- `selectedPricing: Map<string, WorkerPricingSlot[]>` — keyed by `service.id`,
  prices canonical in VND.
- `onSelectedPricingChange: (next: Map<string, WorkerPricingSlot[]>) => void`.
- `serviceHashtags: Map<string, string[]>` — keyed by `service.id`.
- `onServiceHashtagsChange: (next: Map<string, string[]>) => void`.

**Owns internally:** `priceDrafts` state, `useCurrency()`, the VIRTUAL/PHYSICAL
split (two labelled sections via `splitServicesByCategory`), per-service toggle,
per-unit price inputs (currency-aware, using the `worker-setup-pricing` helpers),
and a `HashtagChipInput` per selected service. Emits canonical VND slots +
hashtag arrays through the `onChange` props. Renders nothing about hydration or
submit — those stay in each parent.

### 2. Worker setup uses the component

Replace the inline services render with `<WorkerServicesEditor
selectedPricing={selectedPricing} onSelectedPricingChange={setSelectedPricing}
serviceHashtags={serviceHashtags} onServiceHashtagsChange={setServiceHashtags}
catalog={visibleCatalog} />`. Move `priceDrafts`, `toggleService`,
`setPriceForUnit`, `renderServiceRow` into the component. **Keep unchanged** in
the wizard: hydration (building the two Maps from `mineQuery`),
`originalPricingRef`, and `buildServicesPayload` (submit). Behaviour is identical.

### 3. Admin form uses the component

Change the admin services state from `DraftService[]` to the same two Maps
(`Map<serviceId, WorkerPricingSlot[]>` + `Map<serviceId, string[]>`). Render
`<WorkerServicesEditor/>` in place of the flat `catalog.map` section. Update:
- **Submit** (`buildWorkerPayload`): 2 Maps → `worker_services: [{ service_code,
  pricing, hashtags }]` (resolve `service_code` from catalog by `service.id`;
  build `pricing` slots in the selected currency like today, duration 1).
- **Edit prefill**: `detail.worker_services` (now incl. `hashtags`) → the two
  Maps, mirroring the worker-setup hydration (VND canonical, `originalPricing`
  equivalent for drift-free re-submit; reuse the same helper approach).
- **Sample/random data** (if kept): produce the two Maps instead of
  `DraftService[]`, hashtags empty.

### 4. Backend accepts admin hashtags

- FE `services/user.service.ts`: `AdminWorkerServiceInput` gains
  `hashtags?: string[]`.
- BE `validations/user/user.validation.ts`: the admin `worker_services` item
  gains `hashtags: z.array(z.string()).max(WORKER_SERVICE_HASHTAG_LIMITS.MAX_PER_SERVICE).optional()`.
- BE `services/user/user.service.ts` `resolveWorkerServices`: pass
  `hashtags: normalizeHashtags(item.hashtags ?? [])` into the upsert payload
  (repo already persists it).

### 5. Consistency guarantees

- The worker-setup wizard and the admin form render the **same component** →
  identical VIRTUAL/PHYSICAL grouping, pricing UX (currency-aware), and hashtag
  input. No duplicated service-row markup remains.
- Hashtags round-trip on both create and edit for admin-created workers.

## Testing

- **Backend (jest):** if `resolveWorkerServices` is unit-testable with mocked
  repos, add a test asserting it normalizes hashtags and builds the payload with
  `hashtags`; otherwise verify via `tsc` + the flow. (Existing 26 tests must
  stay green.)
- **Frontend:** `npm run typecheck` + `npm run lint` clean, plus manual:
  admin create a worker (services split into Trợ lý ảo/thực tế, add hashtags,
  save); admin edit that worker (hashtags + prices prefill); the normal worker
  setup wizard still behaves exactly as before.

## Out of Scope

- Changing the worker-setup pricing model or currency behaviour (extracted
  verbatim).
- Backend endpoint changes beyond adding `hashtags` to the admin payload.
- Any redesign of the admin form outside the "Dịch vụ & Giá" section.
