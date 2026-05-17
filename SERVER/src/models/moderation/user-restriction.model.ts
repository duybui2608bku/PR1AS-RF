import mongoose, { Schema } from "mongoose";
import {
  RestrictionFeature,
  RestrictionStatus,
} from "../../constants/moderation";
import { IUserRestrictionDocument } from "../../types/moderation";
import { modelsName } from "../models.name";

const userRestrictionSchema = new Schema<IUserRestrictionDocument>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
    },
    feature: {
      type: String,
      enum: Object.values(RestrictionFeature),
      required: true,
      index: true,
    },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    starts_at: { type: Date, required: true, default: Date.now },
    ends_at: { type: Date, default: null, index: true },
    status: {
      type: String,
      enum: Object.values(RestrictionStatus),
      default: RestrictionStatus.ACTIVE,
      index: true,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
    },
    revoked_by: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      default: null,
    },
    revoked_at: { type: Date, default: null },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    collection: modelsName.USER_RESTRICTION,
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

userRestrictionSchema.index({ user_id: 1, feature: 1, status: 1, ends_at: 1 });

export const UserRestriction = mongoose.model<IUserRestrictionDocument>(
  modelsName.USER_RESTRICTION,
  userRestrictionSchema
);
