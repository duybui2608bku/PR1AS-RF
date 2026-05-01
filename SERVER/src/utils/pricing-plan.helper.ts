import {
  PricingPlanCode,
  PRICING_PLAN_RANK,
  PricingPlanFeatures,
  DEFAULT_PRICING_PLAN_FEATURES,
} from "../constants/pricing";

export const getPlanRank = (planCode: PricingPlanCode): number => {
  return PRICING_PLAN_RANK[planCode] ?? 0;
};

export const hasMinPlan = (
  userPlan: PricingPlanCode,
  requiredPlan: PricingPlanCode
): boolean => {
  return getPlanRank(userPlan) >= getPlanRank(requiredPlan);
};

export const resolveUserPlanFeatures = (
  planCode: PricingPlanCode
): PricingPlanFeatures => {
  return DEFAULT_PRICING_PLAN_FEATURES[planCode];
};
