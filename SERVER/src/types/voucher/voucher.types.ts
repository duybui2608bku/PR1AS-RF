import { Document, Types } from "mongoose";
import { PricingPlanCode } from "../../constants/pricing";

export interface IVoucher {
  code: string;
  plan_code: PricingPlanCode;
  duration_months: number;
  max_uses: number;
  used_count: number;
  expires_at: Date | null;
  is_active: boolean;
  note: string | null;
  created_by: Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export interface IVoucherDocument extends IVoucher, Document {}

export interface IVoucherRedemption {
  voucher_id: Types.ObjectId;
  user_id: Types.ObjectId;
  code: string;
  plan_code: PricingPlanCode;
  duration_months: number;
  created_at: Date;
}

export interface IVoucherRedemptionDocument
  extends IVoucherRedemption, Document {}

export interface CreateVouchersInput {
  plan_code: PricingPlanCode;
  duration_months: number;
  max_uses: number;
  quantity: number;
  code?: string;
  expires_at?: Date | null;
  note?: string;
}

export interface UpdateVoucherInput {
  is_active?: boolean;
  note?: string | null;
  expires_at?: Date | null;
  max_uses?: number;
}

export interface ListVouchersQuery {
  page?: number;
  limit?: number;
  search?: string;
  plan_code?: PricingPlanCode;
  is_active?: boolean;
}
