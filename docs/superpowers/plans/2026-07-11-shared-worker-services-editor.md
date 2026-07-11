# Shared Worker Services Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the admin create/edit-user "Dịch vụ & Giá" section identical to the worker-setup services step (VIRTUAL/PHYSICAL split + per-service hashtag input) by extracting one shared controlled component and reusing it in both places, and persist hashtags for admin-created workers.

**Architecture:** Extract the worker-setup services step into `WorkerServicesEditor` (controlled: parent owns two id-keyed Maps — pricing in VND + hashtags — the component owns price-draft input state, currency display, VIRTUAL/PHYSICAL layout, toggle, and `HashtagChipInput`). Worker setup and the admin form both render it. Backend admin `worker_services` payload gains `hashtags`.

**Tech Stack:** Next.js 16 + React 19 + TypeScript + TanStack Query + shadcn/ui (frontend); Node + Express + TS + Mongoose + Zod (backend).

## Global Constraints

- Frontend: no semicolons; `const` arrow functions with explicit types; Tailwind only; `handle*` handlers; a11y. Reuse `next-intl` `WorkerSetup` namespace keys already used by the worker-setup step (`services.virtualTitle`, `services.physicalTitle`, `services.subtitle`, `services.emptyVirtual`, `services.emptyPhysical`, `pricing.priceHelp`, `pricing.hashtagsLabel`, `units.HOURLY|DAILY|MONTHLY`).
- Pricing is canonical **VND**; display converts via the selected currency (`useCurrency`). Never change that model — it is moved verbatim.
- Maps in the shared component are keyed by `service.id` (worker-setup's existing key).
- Backend strict tsconfig; hashtags normalized server-side (`normalizeHashtags`, `utils/worker-hashtag`), ≤10 per service.
- Client has no test runner: FE verified with `npm run typecheck` + `npm run lint` + manual. Backend `npx jest` (26 existing tests must stay green) + `tsc`.
- Conventional Commits.

---

## File Structure

**Frontend (`pr1as-client/`):**
- `components/worker/worker-services-editor.tsx` — CREATE: shared controlled editor.
- `app/worker/setup/page.tsx` — MODIFY: use the component; remove inline `renderServiceRow`/`toggleService`/`setPriceForUnit`/`priceDrafts`; keep hydration + `buildServicesPayload`.
- `components/dashboard/user-create-form.tsx` — MODIFY: adopt the two Maps model for services; render the component; convert on submit/prefill/sample; carry `hashtags`.
- `services/user.service.ts` — MODIFY: `AdminWorkerServiceInput.hashtags`; admin worker_services read type gains `hashtags`.

**Backend (`SERVER/`):**
- `src/validations/user/admin-create-user.validation.ts` — MODIFY: `adminWorkerServiceSchema` gains `hashtags`.
- `src/services/user/user.service.ts` — MODIFY: `resolveWorkerServices` normalizes + passes `hashtags`; the worker-services read DTO returns `hashtags`.

---

## Task 1: Backend + FE types — admin worker_services carry hashtags

**Files:**
- Modify: `SERVER/src/validations/user/admin-create-user.validation.ts`
- Modify: `SERVER/src/services/user/user.service.ts`
- Modify: `pr1as-client/services/user.service.ts`

**Interfaces:**
- Consumes: `normalizeHashtags` (`SERVER/src/utils/worker-hashtag`), `WORKER_SERVICE_HASHTAG_LIMITS` (`SERVER/src/constants/worker-service`), `UpsertWorkerServicePayload.hashtags` (already optional).
- Produces: admin worker_services accept + persist `hashtags`; admin worker-services **read** returns `hashtags`.

- [ ] **Step 1: Add `hashtags` to `adminWorkerServiceSchema`**

In `SERVER/src/validations/user/admin-create-user.validation.ts`, add the constant import near the top imports:

```typescript
import { WORKER_SERVICE_HASHTAG_LIMITS } from "../../constants/worker-service";
```

Change `adminWorkerServiceSchema` to include `hashtags`:

```typescript
export const adminWorkerServiceSchema = z
  .object({
    service_code: z
      .string({ required_error: "service_code is required" })
      .trim()
      .min(1, { message: "service_code is required" })
      .transform((value) => value.toUpperCase()),
    pricing: z
      .array(pricingSchema)
      .min(1, { message: "pricing must contain at least 1 item" }),
    hashtags: z
      .array(z.string())
      .max(WORKER_SERVICE_HASHTAG_LIMITS.MAX_PER_SERVICE)
      .optional(),
  })
  .strict();
```

(`admin-update-user.validation.ts` imports this same schema — no change needed there.)

- [ ] **Step 2: Normalize + persist hashtags in `resolveWorkerServices`**

In `SERVER/src/services/user/user.service.ts`, add the import (if not present):

```typescript
import { normalizeHashtags } from "../../utils/worker-hashtag";
```

In `resolveWorkerServices`, the `payloads.push({...})` object (currently `serviceId`, `serviceCode`, `pricing`) gains a `hashtags` field. Add after the `pricing:` mapping closes:

```typescript
        hashtags: normalizeHashtags(item.hashtags ?? []),
```

so each pushed payload is `{ serviceId, serviceCode, pricing, hashtags }`. `item.hashtags` is typed by the schema (`string[] | undefined`).

- [ ] **Step 3: Return `hashtags` from the admin worker-services read DTO**

The admin edit flow reads a user's worker services to prefill. Find the method in `SERVER/src/services/user/user.service.ts` that builds the `worker_services` array for the admin detail response (the block documented "worker services (a separate collection) so the form can prefill pricing", around the `worker_services: Array<{ service_code; pricing }>` shape). Add `hashtags: ws.hashtags ?? []` to each mapped item (mirror how the worker profile map does it), and add `hashtags: string[]` to that array's TypeScript shape. If the read maps raw `IWorkerServiceDocument`s, `ws.hashtags` is available from the model.

- [ ] **Step 4: FE admin service types carry hashtags**

In `pr1as-client/services/user.service.ts`:

```typescript
export interface AdminWorkerServiceInput {
  service_code: string
  hashtags?: string[]
  pricing: {
    unit: WorkerPricingUnit
    duration: number
    price: number
    currency?: string
  }[]
}
```

And the admin **detail** `worker_services` read type (the `AdminUserDetail`/detail interface's `worker_services` field) gains `hashtags: string[]` per item (find the interface with `worker_services?: Array<{ service_code; pricing }>` and add `hashtags: string[]`).

- [ ] **Step 5: Verify build**

Run: `cd SERVER && npx tsc --noEmit` (expected clean) and `cd pr1as-client && npm run typecheck` (expected clean — the admin form still compiles; it just won't send hashtags until Task 4).

- [ ] **Step 6: Commit**

```bash
git add SERVER/src/validations/user/admin-create-user.validation.ts SERVER/src/services/user/user.service.ts pr1as-client/services/user.service.ts
git commit -m "feat(user): accept and persist hashtags on admin-created worker services"
```

---

## Task 2: Extract shared `WorkerServicesEditor` component

**Files:**
- Create: `pr1as-client/components/worker/worker-services-editor.tsx`

**Interfaces:**
- Produces: `WorkerServicesEditor` with props
  `{ catalog: ServiceItem[]; selectedPricing: Map<string, WorkerPricingSlot[]>; onSelectedPricingChange: (next: Map<string, WorkerPricingSlot[]>) => void; serviceHashtags: Map<string, string[]>; onServiceHashtagsChange: (next: Map<string, string[]>) => void }`.

- [ ] **Step 1: Write the component**

Create `pr1as-client/components/worker/worker-services-editor.tsx`. It reproduces the worker-setup services UI: two `Card` sections (VIRTUAL/PHYSICAL) from `splitServicesByCategory`, each mapping `renderServiceRow`; the row = toggle + per-unit price inputs (currency-aware) + `HashtagChipInput`. It owns `priceDrafts` internally and `useCurrency()`/`useLocale()`/`useTranslations("WorkerSetup")`. The row/section markup is moved verbatim from `app/worker/setup/page.tsx` (`renderServiceRow` lines 798-902 and the two service `Card`s inside `renderStep3` lines 1336-1370), with these adaptations:

```typescript
"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Check, WalletCards } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HashtagChipInput } from "@/components/worker/hashtag-chip-input"
import { useCurrency } from "@/lib/hooks/use-currency"
import {
  convertToVnd,
  convertVndTo,
  formatAmountInput,
  formatMoney,
  parseAmountInput,
} from "@/lib/currency"
import { splitServicesByCategory } from "@/lib/worker/worker-setup-catalog"
import {
  buildPricingFromUnits,
  normalizeWorkerPricingSlots,
  priceForUnit,
  WORKER_SETUP_PRICING_SLOT_ORDER,
} from "@/lib/worker/worker-setup-pricing"
import { cn } from "@/lib/utils"
import { serviceService, type ServiceItem } from "@/services/service.service"
import type { WorkerPricingSlot, WorkerPricingUnit } from "@/types"

type WorkerServicesEditorProps = {
  catalog: ServiceItem[]
  selectedPricing: Map<string, WorkerPricingSlot[]>
  onSelectedPricingChange: (next: Map<string, WorkerPricingSlot[]>) => void
  serviceHashtags: Map<string, string[]>
  onServiceHashtagsChange: (next: Map<string, string[]>) => void
}

export const WorkerServicesEditor = ({
  catalog,
  selectedPricing,
  onSelectedPricingChange,
  serviceHashtags,
  onServiceHashtagsChange,
}: WorkerServicesEditorProps) => {
  const t = useTranslations("WorkerSetup")
  const locale = useLocale()
  const { currency, meta: currencyMeta, localeTag } = useCurrency()
  const [priceDrafts, setPriceDrafts] = useState<Map<string, string>>(new Map())

  const { virtual: virtualList, physical: physicalList } =
    splitServicesByCategory(catalog)

  const toggleService = (serviceId: string) => {
    const next = new Map(selectedPricing)
    if (next.has(serviceId)) {
      next.delete(serviceId)
    } else {
      next.set(serviceId, [])
    }
    onSelectedPricingChange(next)
  }

  const setPriceForUnit = (
    serviceId: string,
    unit: WorkerPricingUnit,
    raw: string
  ) => {
    const typed = parseAmountInput(raw, currencyMeta.decimals)
    const valueVnd = typed == null ? undefined : convertToVnd(typed, currency)
    setPriceDrafts((prev) => {
      const next = new Map(prev)
      next.set(
        `${serviceId}:${unit}:${currency}`,
        formatAmountInput(raw, localeTag, currencyMeta.decimals)
      )
      return next
    })
    const next = new Map(selectedPricing)
    const cur = normalizeWorkerPricingSlots(next.get(serviceId) ?? [])
    next.set(serviceId, buildPricingFromUnits(unit, valueVnd, cur, "VND"))
    onSelectedPricingChange(next)
  }

  const handleHashtagsChange = (serviceId: string, tags: string[]) => {
    const next = new Map(serviceHashtags)
    next.set(serviceId, tags)
    onServiceHashtagsChange(next)
  }

  const renderServiceRow = (service: ServiceItem) => {
    const checked = selectedPricing.has(service.id)
    const pricing = normalizeWorkerPricingSlots(
      selectedPricing.get(service.id) ?? []
    )

    return (
      <div
        key={service.id}
        className="overflow-hidden rounded-2xl border border-border bg-card"
      >
        <Button
          type="button"
          variant="ghost"
          className="flex h-auto w-full items-center gap-3 px-4 py-4 text-left transition-colors active:bg-accent/60"
          onClick={() => toggleService(service.id)}
        >
          <div
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all",
              checked
                ? "border-primary bg-primary"
                : "border-muted-foreground/40 bg-transparent"
            )}
          >
            {checked && (
              <Check className="size-3.5 stroke-[3] text-primary-foreground" />
            )}
          </div>
          <span className="flex-1 text-sm leading-snug font-medium">
            {serviceService.getName(service.name, locale)}
          </span>
        </Button>

        {checked && (
          <div className="space-y-2.5 border-t border-border bg-muted/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {t("pricing.priceHelp", { currency: currencyMeta.code })}
            </p>
            {WORKER_SETUP_PRICING_SLOT_ORDER.map((unit) => {
              const priceVnd = priceForUnit(pricing, unit)
              const draftKey = `${service.id}:${unit}:${currency}`
              const displayValue = priceDrafts.has(draftKey)
                ? priceDrafts.get(draftKey)!
                : formatAmountInput(
                    priceVnd == null
                      ? undefined
                      : Number(
                          convertVndTo(priceVnd, currency).toFixed(
                            currencyMeta.decimals
                          )
                        ),
                    localeTag,
                    currencyMeta.decimals
                  )
              const showVnd =
                currency !== "VND" && priceVnd != null && priceVnd > 0
              return (
                <div key={unit} className="space-y-1">
                  <div className="flex items-center gap-3">
                    <Label className="w-20 shrink-0 text-xs text-muted-foreground">
                      {t(`units.${unit}`)}
                    </Label>
                    <div className="relative flex-1">
                      <Input
                        type="text"
                        inputMode={
                          currencyMeta.decimals > 0 ? "decimal" : "numeric"
                        }
                        placeholder="0"
                        value={displayValue}
                        onChange={(e) =>
                          setPriceForUnit(service.id, unit, e.target.value)
                        }
                        className="h-11 pr-10 text-sm"
                      />
                      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                        {currencyMeta.symbol}
                      </span>
                    </div>
                  </div>
                  {showVnd && (
                    <p className="pl-[5.75rem] text-xs text-muted-foreground">
                      ≈ {formatMoney(priceVnd, "VND", localeTag)}
                    </p>
                  )}
                </div>
              )
            })}
            <div className="space-y-1 pt-1">
              <Label className="text-xs text-muted-foreground">
                {t("pricing.hashtagsLabel")}
              </Label>
              <HashtagChipInput
                value={serviceHashtags.get(service.id) ?? []}
                onChange={(tags) => handleHashtagsChange(service.id, tags)}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden rounded-2xl border-border shadow-none">
        <CardHeader className="px-4 pt-4 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <WalletCards className="size-4 text-primary" />
            {t("services.virtualTitle")}
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("services.subtitle")}
          </p>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          {virtualList.map((s) => renderServiceRow(s))}
          {virtualList.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t("services.emptyVirtual")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-border shadow-none">
        <CardHeader className="px-4 pt-4 pb-3">
          <CardTitle className="text-base">
            {t("services.physicalTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4">
          {physicalList.map((s) => renderServiceRow(s))}
          {physicalList.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t("services.emptyPhysical")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

Confirm `formatMoney`, `parseAmountInput`, `convertToVnd`, `convertVndTo`, `formatAmountInput` are all exported from `@/lib/currency` (they are — used by the worker-setup page). Confirm `useCurrency` returns `{ currency, meta, localeTag }`.

- [ ] **Step 2: Verify types compile**

Run: `cd pr1as-client && npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add pr1as-client/components/worker/worker-services-editor.tsx
git commit -m "feat(worker): add shared WorkerServicesEditor component"
```

---

## Task 3: Worker setup uses the shared component

**Files:**
- Modify: `pr1as-client/app/worker/setup/page.tsx`

**Interfaces:**
- Consumes: `WorkerServicesEditor` (Task 2).

- [ ] **Step 1: Replace the services step render + remove the moved logic**

In `pr1as-client/app/worker/setup/page.tsx`:
1. Import the component: `import { WorkerServicesEditor } from "@/components/worker/worker-services-editor"`.
2. Delete `renderServiceRow` (lines ~797-902), `toggleService` (~591-601), `setPriceForUnit` (~567-589), `handleServiceHashtagsChange` (~603-608), and the `priceDrafts` state (`const [priceDrafts, setPriceDrafts] = useState<Map<string, string>>(new Map())`).
3. Replace the two service `Card`s inside `renderStep3` (lines ~1336-1370) with the component, keeping the `catalogQuery.isError` alert and the outer `<div className="space-y-5">`:

```tsx
  const renderStep3 = () => (
    <div className="space-y-5">
      {catalogQuery.isError && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="size-4" />
          <AlertTitle>{t("services.loadErrorTitle")}</AlertTitle>
          <AlertDescription>{t("services.loadErrorDesc")}</AlertDescription>
        </Alert>
      )}
      <WorkerServicesEditor
        catalog={catalog}
        selectedPricing={selectedPricing}
        onSelectedPricingChange={setSelectedPricing}
        serviceHashtags={serviceHashtags}
        onServiceHashtagsChange={setServiceHashtags}
      />
    </div>
  )
```

4. Remove now-unused imports/vars if they become dead: the `splitServicesByCategory` import + the `virtualList`/`physicalList` `useMemo` (lines ~361-363), `HashtagChipInput` import, `WORKER_SETUP_PRICING_SLOT_ORDER`/`priceForUnit`/`buildPricingFromUnits`/`normalizeWorkerPricingSlots` imports **only if** no longer referenced elsewhere in the file (`buildServicesPayload` still uses `normalizeWorkerPricingSlots` + `validateNormalizedPricing` — keep those), plus `WalletCards`, `Check`, `convertToVnd`, `parseAmountInput`, `formatMoney`, `convertVndTo`, `formatAmountInput` if unused after removal. Let `npm run typecheck` (strict `noUnusedLocals` is NOT on for the client, but lint flags unused) and `npm run lint` guide the cleanup — remove every import/var they report as unused.

- [ ] **Step 2: Verify types + lint + behaviour unchanged**

Run: `cd pr1as-client && npm run typecheck && npx eslint app/worker/setup/page.tsx components/worker/worker-services-editor.tsx`
Expected: typecheck clean; no NEW eslint errors (pre-existing `exhaustive-deps` warnings on the page are acceptable). Manually: open `/worker/setup`, reach the services step — VIRTUAL/PHYSICAL sections, pricing, and hashtags behave exactly as before; save + reload prefills correctly.

- [ ] **Step 3: Commit**

```bash
git add pr1as-client/app/worker/setup/page.tsx
git commit -m "refactor(worker): use shared WorkerServicesEditor in setup wizard"
```

---

## Task 4: Admin form adopts the Maps model + uses the component

**Files:**
- Modify: `pr1as-client/components/dashboard/user-create-form.tsx`

**Interfaces:**
- Consumes: `WorkerServicesEditor` (Task 2); `AdminWorkerServiceInput.hashtags` (Task 1); `WorkerPricingSlot` (`@/types`); `worker-setup-pricing` helpers.

- [ ] **Step 1: Replace the `DraftService[]` model with two Maps**

In `pr1as-client/components/dashboard/user-create-form.tsx`:
1. Change `UserDraft.services` from `DraftService[]` to two fields:

```typescript
  servicePricing: Map<string, WorkerPricingSlot[]>
  serviceHashtags: Map<string, string[]>
```

Update the initial draft (`services: []` → `servicePricing: new Map(), serviceHashtags: new Map()`) and any reset. Delete the `DraftService`/`DraftServicePrices` types and `emptyPrices()` if now unused. Add imports: `WorkerServicesEditor`, `type WorkerPricingSlot` from `@/types`, and the `worker-setup-pricing` helpers (`buildPricingFromUnits`, `normalizeWorkerPricingSlots`, `priceForUnit`, `WORKER_SETUP_PRICING_SLOT_ORDER`) as needed by the conversions below.

2. **Submit** (`buildWorkerFields`): iterate `draft.servicePricing` (id-keyed VND slots). For each `[serviceId, slots]`, look up the catalog service by id to get `service_code`; convert each VND slot to the selected currency (same `convertVndTo` + duration 1 logic already there); collect `hashtags = draft.serviceHashtags.get(serviceId) ?? []`; push `{ service_code, pricing, hashtags }`. Keep the "at least 1 service" / "at least 1 price" validation. The catalog must be in scope here (it is fetched in the form); if `buildWorkerFields` is a module-level function without catalog access, pass the catalog + maps in, or move the conversion into the component-scope submit handler that has `catalog`.

3. **Prefill** (`fromDetail`, currently mapping `detail.worker_services` → `DraftService[]`): build the two Maps instead — for each `s` in `detail.worker_services`, resolve `service.id` from the catalog by `s.service_code` (skip if not found); `servicePricing.set(id, s.pricing.map(p => ({ unit: p.unit, duration: p.duration ?? 1, price: p.price_vnd ?? p.price, currency: "VND" })))`; `serviceHashtags.set(id, s.hashtags ?? [])`. If the catalog isn't available at `fromDetail` time (it's fetched async), seed the Maps in an effect once both `detail` and `catalog` are ready (mirror the worker-setup hydration pattern), or store the raw `worker_services` and convert in a `useMemo`/effect. Pick the effect-based hydration to match worker setup.

4. **Sample/random data** (if kept): produce the two Maps (id-keyed, VND slots) with empty hashtags instead of `DraftService[]`.

- [ ] **Step 2: Render the shared component in the services section**

Replace the flat `catalog.map(...)` services sub-component body (the `<SectionCard title="Dịch vụ & Giá">...</SectionCard>` block, ~lines 1450-1520+) so the `SectionCard` wraps the shared component:

```tsx
    <SectionCard
      title="Dịch vụ & Giá"
      subtitle={`Chọn dịch vụ cung cấp và nhập giá (${currencyMeta.code}) cho ít nhất một đơn vị`}
    >
      {loading ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Đang tải danh mục dịch vụ...
        </p>
      ) : (
        <WorkerServicesEditor
          catalog={catalog}
          selectedPricing={draft.servicePricing}
          onSelectedPricingChange={(next) => onPatch({ servicePricing: next })}
          serviceHashtags={draft.serviceHashtags}
          onServiceHashtagsChange={(next) => onPatch({ serviceHashtags: next })}
        />
      )}
    </SectionCard>
```

Delete the now-unused admin `toggleService`, `setPrice`, `priceDrafts`, `PRICING_UNITS`/`UNIT_LABEL` (if only used here), and related currency imports that the shared component now owns — again let `npm run typecheck` + `npm run lint` drive the dead-code removal.

- [ ] **Step 3: Verify types + lint**

Run: `cd pr1as-client && npm run typecheck && npx eslint components/dashboard/user-create-form.tsx`
Expected: typecheck clean; no new eslint errors.

- [ ] **Step 4: Manually verify the admin flow**

Run client + backend. As admin: create a worker — the services section shows Trợ lý ảo / Trợ lý thực tế split, per-service pricing, and hashtag chips; save. Edit that worker — prices + hashtags prefill; change and save. Confirm the created worker's public profile shows the hashtags (from the earlier feature).

- [ ] **Step 5: Commit**

```bash
git add pr1as-client/components/dashboard/user-create-form.tsx
git commit -m "refactor(user): reuse WorkerServicesEditor in admin create/edit form"
```

---

## Final verification

- [ ] **Backend + FE gates**

Run: `cd SERVER && npx jest && npx tsc --noEmit` (26/26 pass, clean) and `cd pr1as-client && npm run typecheck && npm run lint` (clean; only pre-existing warnings).

- [ ] **Append a SESSIONS.md entry** summarizing the shared editor + admin hashtags.

## Self-Review notes (spec coverage)

- VIRTUAL/PHYSICAL split + hashtag in admin → Tasks 2+4. Worker setup unchanged behaviour → Task 3. Backend persists admin hashtags → Task 1. Both render the same component → identical UX. No placeholder steps; the large render block is provided verbatim in Task 2 and referenced (not re-typed) in Tasks 3/4.
