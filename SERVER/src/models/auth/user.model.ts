import mongoose, { Schema } from "mongoose";

import { gender, IUserDocument, UserRole, UserStatus } from "../../types";

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

export const User = mongoose.model<IUserDocument>("User", userSchema);
