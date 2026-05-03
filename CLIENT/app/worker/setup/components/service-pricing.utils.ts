import type { ServicePricing } from "@/lib/types/worker";

export type PricingValidationError =
  | "empty"
  | "duplicate"
  | "invalidPrice";

export function validateNormalizedPricing(
  pricing: ServicePricing[]
): PricingValidationError | null {
  if (pricing.length === 0) {
    return "empty";
  }
  if (new Set(pricing.map((item) => item.unit)).size !== pricing.length) {
    return "duplicate";
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
