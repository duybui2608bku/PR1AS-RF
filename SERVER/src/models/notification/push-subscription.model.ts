import mongoose, { Schema } from "mongoose";
import { IPushSubscriptionDocument } from "../../types/notification";
import { modelsName } from "../models.name";

const webPushKeysSchema = new Schema(
  {
    p256dh: {
      type: String,
      required: true,
    },
    auth: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const pushSubscriptionSchema = new Schema<IPushSubscriptionDocument>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    keys: {
      type: webPushKeysSchema,
      required: true,
    },
    user_agent: {
      type: String,
      default: null,
    },
    is_active: {
      type: Boolean,
      default: true,
      index: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
    last_used_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: false,
    collection: modelsName.PUSH_SUBSCRIPTION,
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

pushSubscriptionSchema.index({ user_id: 1, is_active: 1 });

export const PushSubscription = mongoose.model<IPushSubscriptionDocument>(
  modelsName.PUSH_SUBSCRIPTION,
  pushSubscriptionSchema
);
