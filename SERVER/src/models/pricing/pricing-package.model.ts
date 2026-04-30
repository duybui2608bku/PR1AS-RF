import mongoose, { Schema } from "mongoose";
import { modelsName } from "../models.name";
import { PricingPlanCode } from "../../constants/pricing";
import { IPricingPackageDocument } from "../../types/pricing";

const featuresSchema = new Schema(
  {
    messaging_enabled: { type: Boolean, default: false },
    messaging_max_recipients: { type: Number, default: null, min: 1 },
    create_job_enabled: { type: Boolean, default: true },
    create_job_limit: { type: Number, default: null, min: 1 },
    boost_profile_enabled: { type: Boolean, default: false },
    boost_profile_monthly_limit: { type: Number, default: null, min: 0 },
    ads_enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const pricingPackageSchema = new Schema<IPricingPackageDocument>(
  {
    package_code: {
      type: String,
      enum: Object.values(PricingPlanCode),
      required: true,
      unique: true,
      index: true,
    },
    display_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    features: {
      type: featuresSchema,
      required: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: modelsName.PRICING_PACKAGE,
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

pricingPackageSchema.pre("save", function updateTimestamp() {
  this.updated_at = new Date();
});

export const PricingPackage = mongoose.model<IPricingPackageDocument>(
  modelsName.PRICING_PACKAGE,
  pricingPackageSchema
);
