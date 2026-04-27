import mongoose, { Schema } from "mongoose";
import {
  NotificationCategory,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationPriority,
  NotificationType,
} from "../../constants/notification";
import { INotificationDocument } from "../../types/notification";
import { modelsName } from "../models.name";

const notificationDeliverySchema = new Schema(
  {
    channel: {
      type: String,
      enum: Object.values(NotificationChannel),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(NotificationDeliveryStatus),
      default: NotificationDeliveryStatus.PENDING,
    },
    attempted_at: {
      type: Date,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const notificationSchema = new Schema<INotificationDocument>(
  {
    recipient_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      required: true,
      index: true,
    },
    actor_id: {
      type: Schema.Types.ObjectId,
      ref: modelsName.USER,
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(NotificationCategory),
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    link: {
      type: String,
      trim: true,
      default: null,
    },
    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      default: NotificationPriority.NORMAL,
      index: true,
    },
    channels: {
      type: [String],
      enum: Object.values(NotificationChannel),
      default: [NotificationChannel.IN_APP],
    },
    delivery: {
      type: [notificationDeliverySchema],
      default: [],
    },
    dedupe_key: {
      type: String,
      trim: true,
      default: null,
    },
    read_at: {
      type: Date,
      default: null,
      index: true,
    },
    archived_at: {
      type: Date,
      default: null,
      index: true,
    },
    expires_at: {
      type: Date,
      default: null,
      index: true,
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
    collection: modelsName.NOTIFICATION,
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

notificationSchema.index({ recipient_id: 1, read_at: 1, created_at: -1 });
notificationSchema.index({ recipient_id: 1, archived_at: 1, created_at: -1 });
notificationSchema.index({ recipient_id: 1, type: 1, created_at: -1 });
notificationSchema.index(
  { recipient_id: 1, dedupe_key: 1 },
  {
    unique: true,
    partialFilterExpression: { dedupe_key: { $type: "string" } },
  }
);

export const Notification = mongoose.model<INotificationDocument>(
  modelsName.NOTIFICATION,
  notificationSchema
);
