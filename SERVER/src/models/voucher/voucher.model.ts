import mongoose, { Schema } from "mongoose";
import { modelsName } from "../models.name";
import { PricingPlanCode } from "../../constants/pricing";
import { IVoucherDocument } from "../../types/voucher";

const voucherSchema = new Schema<IVoucherDocument>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 32,
      index: true,
    },
    plan_code: {
      type: String,
      enum: Object.values(PricingPlanCode),
      required: true,
      index: true,
    },
    duration_months: {
      type: Number,
      required: true,
      min: 1,
      max: 24,
    },
    max_uses: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    used_count: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    expires_at: {
      type: Date,
      default: null,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    note: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: modelsName.VOUCHER,
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

voucherSchema.pre("save", function updateTimestamp() {
  this.updated_at = new Date();
});

export const Voucher = mongoose.model<IVoucherDocument>(
  modelsName.VOUCHER,
  voucherSchema
);
