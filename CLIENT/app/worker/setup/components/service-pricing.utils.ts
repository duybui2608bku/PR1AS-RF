import type { ServicePricing } from "@/lib/types/worker";
import { PricingUnit } from "@/lib/types/worker";

/** One price slot per unit (Giờ / Ngày / Tháng) — order for display and payload. */
export const WORKER_SETUP_PRICING_SLOT_ORDER: PricingUnit[] = [
  PricingUnit.HOURLY,
  PricingUnit.DAILY,
  PricingUnit.MONTHLY,
];

/** Keeps the last entry per unit; drops unknown units; stable HOURLY → DAILY → MONTHLY order. */
export function normalizeWorkerPricingSlots(
  pricing: ServicePricing[]
): ServicePricing[] {
  const map = new Map<PricingUnit, ServicePricing>();
  for (const p of pricing) {
    if (!p?.unit) {
      continue;
    }
    map.set(p.unit, {
      unit: p.unit,
      duration: p.duration ?? 1,
      price: p.price,
    });
  }
  return WORKER_SETUP_PRICING_SLOT_ORDER.filter((u) => map.has(u)).map(
    (u) => map.get(u)!
  );
}

export type PricingValidationError = "empty" | "invalidPrice";

export function validateNormalizedPricing(
  pricing: ServicePricing[]
): PricingValidationError | null {
  if (pricing.length === 0) {
    return "empty";
  }
  if (
    pricing.some(
      (p) =>
        !p.unit ||
        Number.isNaN(p.price) ||
        p.price == null ||
        p.price < 0.01
    )
  ) {
    return "invalidPrice";
  }
  return null;
}
