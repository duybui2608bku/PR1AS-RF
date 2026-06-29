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
      select: false,
      default: null,
    },
    google_id: {
      type: String,
      select: false,
      default: null,
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
          work_locations: [
            {
              province_code: { type: Number, required: true },
              ward_code: { type: Number, default: null },
              label_snapshot: { type: String, default: null },
            },
          ],
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
      index: true,
    },
    booking_lock_version: {
      type: Number,
      default: 0,
      select: false,
    },
    deleted_at: {
      type: Date,
      default: null,
    },
    verify_email: {
      type: Boolean,
      default: false,
    },
    // True for accounts provisioned through the admin "create user" flow. Only
    // these accounts may be edited by an admin; real (self-registered) users
    // are read-only from the admin panel.
    created_by_admin: {
      type: Boolean,
      default: false,
      index: true,
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
    previous_refresh_token_hash: {
      type: String,
      select: false,
      default: null,
    },
    refresh_token_rotated_at: {
      type: Date,
      select: false,
      default: null,
    },
    failed_login_attempts: {
      type: Number,
      default: 0,
      select: false,
    },
    locked_until: {
      type: Date,
      default: null,
      select: false,
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
    meta_data: {
      type: new Schema(
        {
          reputation_score: {
            type: Number,
            default: 100,
            min: 0,
            max: 100,
            index: true,
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
          onboarding_done: {
            type: Boolean,
            default: false,
          },
          locale: {
            type: String,
            default: "en",
          },
        },
        { _id: false }
      ),
      default: () => ({
        reputation_score: 100,
        pricing_plan_code: PricingPlanCode.STANDARD,
        pricing_started_at: null,
        pricing_expires_at: null,
        onboarding_done: false,
        locale: "en",
      }),
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

userSchema.index({ password_reset_token: 1 });
userSchema.index({ email_verification_token: 1 });
// Partial (not sparse) unique index: enforce uniqueness only for real Google
// accounts. The schema defaults google_id to `null`, so a sparse index would
// still index every non-Google user (field present, value null) and reject the
// second one with E11000 on `{ google_id: null }`. Restricting the index to
// string values lets unlimited email/password accounts coexist.
userSchema.index(
  { google_id: 1 },
  {
    unique: true,
    partialFilterExpression: { google_id: { $type: "string" } },
  }
);
userSchema.index({
  "meta_data.pricing_plan_code": 1,
  "meta_data.pricing_expires_at": 1,
});

export const User = mongoose.model<IUserDocument>(modelsName.USER, userSchema);
