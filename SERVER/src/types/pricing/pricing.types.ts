import { Document } from "mongoose";
import { PricingPlanCode, PricingPlanFeatures } from "../../constants/pricing";

export interface IPricingPackage {
  package_code: PricingPlanCode;
  display_name: string;
  is_active: boolean;
  features: PricingPlanFeatures;
  created_at: Date;
  updated_at: Date;
}

export interface IPricingPackageDocument extends IPricingPackage, Document {}
