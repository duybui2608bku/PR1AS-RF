import mongoose, { Schema } from "mongoose";
import { modelsName } from "../models.name";
import { PricingPlanCode } from "../../constants/pricing";
import {
  IUserSubscriptionHistoryDocument,
  SubscriptionEventStatus,
  SubscriptionEventType,
  SubscriptionSource,
} from "../../types/pricing";

const userSubscriptionHistorySchema =
  new Schema<IUserSubscriptionHistoryDocument>(
    {
      user_id: {
        type: Schema.Types.ObjectId,
        ref: modelsName.USER,
        required: true,
        index: true,
      },
      from_plan_code: {
        type: String,
        enum: Object.values(PricingPlanCode),
        required: true,
      },
      to_plan_code: {
        type: String,
        enum: Object.values(PricingPlanCode),
        required: true,
      },
      event_type: {
        type: String,
        enum: Object.values(SubscriptionEventType),
        required: true,
        index: true,
      },
      status: {
        type: String,
        enum: Object.values(SubscriptionEventStatus),
        default: SubscriptionEventStatus.SUCCESS,
        required: true,
        index: true,
      },
      source: {
        type: String,
        enum: Object.values(SubscriptionSource),
        required: true,
      },
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      currency: {
        type: String,
        default: "VND",
        required: true,
      },
      started_at: {
        type: Date,
        default: null,
      },
      expires_at: {
        type: Date,
        default: null,
      },
      idempotency_key: {
        type: String,
        default: null,
        index: true,
      },
      metadata: {
        type: Schema.Types.Mixed,
        default: null,
      },
      created_at: {
        type: Date,
        default: Date.now,
        index: true,
      },
    },
    {
      timestamps: false,
      collection: modelsName.USER_SUBSCRIPTION_HISTORY,
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

userSubscriptionHistorySchema.index({ user_id: 1, created_at: -1 });
userSubscriptionHistorySchema.index(
  { user_id: 1, idempotency_key: 1 },
  { unique: true, sparse: true }
);

export const UserSubscriptionHistory =
  mongoose.model<IUserSubscriptionHistoryDocument>(
    modelsName.USER_SUBSCRIPTION_HISTORY,
    userSubscriptionHistorySchema
  );
