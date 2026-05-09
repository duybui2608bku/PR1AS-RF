import type { WorkerPricingUnit, WorkerPricingSlot } from "@/types"

export const WORKER_SETUP_PRICING_SLOT_ORDER: WorkerPricingUnit[] = [
  "HOURLY",
  "DAILY",
  "MONTHLY",
]

export function normalizeWorkerPricingSlots(
  pricing: WorkerPricingSlot[],
): WorkerPricingSlot[] {
  const map = new Map<WorkerPricingUnit, WorkerPricingSlot>()
  for (const p of pricing) {
    if (!p?.unit) {
      continue
    }
    map.set(p.unit, {
      unit: p.unit,
      duration: p.duration ?? 1,
      price: p.price,
      currency: p.currency ?? "VND",
    })
  }
  return WORKER_SETUP_PRICING_SLOT_ORDER.filter((u) => map.has(u)).map(
    (u) => map.get(u)!,
  )
}

export type PricingValidationError = "empty" | "invalidPrice"

export function validateNormalizedPricing(
  pricing: WorkerPricingSlot[],
): PricingValidationError | null {
  if (pricing.length === 0) {
    return "empty"
  }
  if (
    pricing.some(
      (p) =>
        !p.unit ||
        Number.isNaN(p.price) ||
        p.price == null ||
        p.price <= 0,
    )
  ) {
    return "invalidPrice"
  }
  return null
}

export function buildPricingFromUnits(
  unit: WorkerPricingUnit,
  value: number | undefined,
  current: WorkerPricingSlot[],
): WorkerPricingSlot[] {
  const map = new Map<WorkerPricingUnit, number>()
  for (const p of current) {
    if (p.unit && p.price > 0) {
      map.set(p.unit, p.price)
    }
  }
  if (value == null || Number.isNaN(Number(value)) || value <= 0) {
    map.delete(unit)
  } else {
    map.set(unit, Number(value))
  }
  return WORKER_SETUP_PRICING_SLOT_ORDER.filter((u) => map.has(u)).map((u) => ({
    unit: u,
    duration: 1,
    price: map.get(u)!,
    currency: "VND",
  }))
}

export function priceForUnit(
  pricing: WorkerPricingSlot[],
  unit: WorkerPricingUnit,
): number | undefined {
  const row = pricing.find((p) => p.unit === unit)
  if (!row || row.price == null || row.price <= 0) {
    return undefined
  }
  return row.price
}
