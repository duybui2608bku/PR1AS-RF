import mongoose, { Schema } from "mongoose";
import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from "../../constants/notification";
import { INotificationDeliveryLogDocument } from "../../types/notification";
import { modelsName } from "../models.name";

const notificationDeliveryLogSchema =
  new Schema<INotificationDeliveryLogDocument>(
    {
      notification_id: {
        type: Schema.Types.ObjectId,
        ref: modelsName.NOTIFICATION,
        required: true,
        index: true,
      },
      recipient_id: {
        type: Schema.Types.ObjectId,
        ref: modelsName.USER,
        required: true,
        index: true,
      },
      channel: {
        type: String,
        enum: Object.values(NotificationChannel),
        required: true,
        index: true,
      },
      status: {
        type: String,
        enum: Object.values(NotificationDeliveryStatus),
        required: true,
        index: true,
      },
      provider: {
        type: String,
        default: null,
      },
      error: {
        type: String,
        default: null,
      },
      metadata: {
        type: Schema.Types.Mixed,
        default: {},
      },
      created_at: {
        type: Date,
        default: Date.now,
        index: true,
      },
    },
    {
      timestamps: false,
      collection: modelsName.NOTIFICATION_DELIVERY_LOG,
    }
  );

notificationDeliveryLogSchema.index({
  notification_id: 1,
  channel: 1,
  created_at: -1,
});

export const NotificationDeliveryLog =
  mongoose.model<INotificationDeliveryLogDocument>(
    modelsName.NOTIFICATION_DELIVERY_LOG,
    notificationDeliveryLogSchema
  );
