import { Document, Types } from "mongoose";
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

export enum SubscriptionEventType {
  UPGRADE = "upgrade",
  EXPIRED_DOWNGRADE = "expired_downgrade",
}

export enum SubscriptionEventStatus {
  SUCCESS = "success",
  FAILED = "failed",
}

export enum SubscriptionSource {
  WALLET = "wallet",
  SYSTEM = "system",
}

export interface IUserSubscriptionHistory {
  user_id: Types.ObjectId;
  from_plan_code: PricingPlanCode;
  to_plan_code: PricingPlanCode;
  event_type: SubscriptionEventType;
  status: SubscriptionEventStatus;
  source: SubscriptionSource;
  amount: number;
  currency: string;
  started_at: Date | null;
  expires_at: Date | null;
  idempotency_key?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: Date;
}

export interface IUserSubscriptionHistoryDocument
  extends IUserSubscriptionHistory, Document {}

export interface PricingMeResponse {
  plan_code: PricingPlanCode;
  started_at: Date | null;
  expires_at: Date | null;
  is_expired: boolean;
  package: IPricingPackage;
}

export interface UpgradePricingInput {
  target_plan_code: PricingPlanCode;
  duration_months: number;
  idempotency_key?: string;
}
