export enum PricingPlanCode {
  STANDARD = "standard",
  GOLD = "gold",
  DIAMOND = "diamond",
}

export interface PricingPlanFeatures {
  messaging_enabled: boolean;
  messaging_max_recipients: number | null;
  create_job_enabled: boolean;
  create_job_limit: number | null;
  boost_profile_enabled: boolean;
  boost_profile_monthly_limit: number | null;
  ads_enabled: boolean;
}

export const DEFAULT_PRICING_PLAN_FEATURES: Record<
  PricingPlanCode,
  PricingPlanFeatures
> = {
  [PricingPlanCode.STANDARD]: {
    messaging_enabled: false,
    messaging_max_recipients: null,
    create_job_enabled: true,
    create_job_limit: 1,
    boost_profile_enabled: false,
    boost_profile_monthly_limit: null,
    ads_enabled: true,
  },
  [PricingPlanCode.GOLD]: {
    messaging_enabled: true,
    messaging_max_recipients: 3,
    create_job_enabled: true,
    create_job_limit: 3,
    boost_profile_enabled: true,
    boost_profile_monthly_limit: 1,
    ads_enabled: true,
  },
  [PricingPlanCode.DIAMOND]: {
    messaging_enabled: true,
    messaging_max_recipients: null,
    create_job_enabled: true,
    create_job_limit: null,
    boost_profile_enabled: true,
    boost_profile_monthly_limit: 3,
    ads_enabled: false,
  },
};
