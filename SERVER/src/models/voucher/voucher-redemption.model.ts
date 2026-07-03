import mongoose, { Schema } from "mongoose";
import { modelsName } from "../models.name";
import { PricingPlanCode } from "../../constants/pricing";
import { IVoucherRedemptionDocument } from "../../types/voucher";

const voucherRedemptionSchema = new Schema<IVoucherRedemptionDocument>(
  {
    voucher_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.VOUCHER,
      required: true,
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
    },
    plan_code: {
      type: String,
      enum: Object.values(PricingPlanCode),
      required: true,
    },
    duration_months: {
      type: Number,
      required: true,
      min: 1,
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
    collection: modelsName.VOUCHER_REDEMPTION,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as mongoose.Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// One redemption per user per voucher — this is the hard guard against a user
// redeeming the same code twice (the service pre-check is only for a friendly
// error message).
voucherRedemptionSchema.index({ voucher_id: 1, user_id: 1 }, { unique: true });

export const VoucherRedemption = mongoose.model<IVoucherRedemptionDocument>(
  modelsName.VOUCHER_REDEMPTION,
  voucherRedemptionSchema
);
