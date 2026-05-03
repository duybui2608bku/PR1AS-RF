import mongoose, { Schema } from "mongoose";

import {
  gender,
  Experience,
  IUserDocument,
  UserRole,
  UserStatus,
} from "../../types";
import { PricingPlanCode } from "../../constants/pricing";
import { modelsName } from "../models.name";

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password_hash: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    full_name: {
      type: String,
      trim: true,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    roles: {
      type: [String],

      enum: Object.values(UserRole),

      default: [UserRole.CLIENT],
    },
    last_active_role: {
      type: String,

      enum: Object.values(UserRole),

      default: UserRole.CLIENT,
    },
    worker_profile: {
      type: new Schema(
        {
          date_of_birth: { type: Date, default: null },
          gender: {
            type: String,
            enum: gender,
            default: gender.OTHER,
          },
          height_cm: { type: Number, default: null },
          weight_kg: { type: Number, default: null },
          star_sign: { type: String, default: null },
          lifestyle: { type: String, default: null },
          hobbies: { type: [String], default: [] },
          quote: { type: String, default: null },
          introduction: { type: String, default: null },
          gallery_urls: { type: [String], default: [] },
          experience: {
            type: String,
            enum: Object.values(Experience),
            default: null,
          },
          title: { type: String, default: null, trim: true },
          work_locations: {
            type: [
              {
                province_code: { type: Number, required: true },
                ward_code: { type: Number, required: true },
                label_snapshot: { type: String, default: null },
              },
            ],
            default: undefined,
          },
        },
        { _id: false }
      ),
      default: null,
    },
    client_profile: {
      type: new Schema(
        {
          company_name: { type: String, default: null },
          website: { type: String, default: null },
          total_spent: { type: Number, default: 0 },
        },
        { _id: false }
      ),
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
    },
    verify_email: {
      type: Boolean,
      default: false,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    last_login: {
      type: Date,
      default: null,
    },
    refresh_token_hash: {
      type: String,
      select: false,
      default: null,
    },
    password_reset_token: {
      type: String,
      select: false,
      default: null,
    },
    password_reset_expires: {
      type: Date,
      select: false,
      default: null,
    },
    email_verification_token: {
      type: String,
      select: false,
      default: null,
    },
    email_verification_expires: {
      type: Date,
      select: false,
      default: null,
    },
    coords: {
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
    },
    pricing_plan_code: {
      type: String,
      enum: Object.values(PricingPlanCode),
      default: PricingPlanCode.STANDARD,
      index: true,
    },
    pricing_started_at: {
      type: Date,
      default: null,
    },
    pricing_expires_at: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: false,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = (ret._id as mongoose.Types.ObjectId).toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password_hash;
        return ret;
      },
    },
  }
);

userSchema.index({ email: 1 });
userSchema.index({ password_reset_token: 1 });
userSchema.index({ email_verification_token: 1 });
userSchema.index({ pricing_plan_code: 1, pricing_expires_at: 1 });

export const User = mongoose.model<IUserDocument>(modelsName.USER, userSchema);
