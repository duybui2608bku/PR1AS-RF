import mongoose, { Schema } from "mongoose";
import {
  NotificationChannel,
  NotificationType,
} from "../../constants/notification";
import { INotificationPreferenceDocument } from "../../types/notification";
import { modelsName } from "../models.name";

const notificationPreferenceSchema =
  new Schema<INotificationPreferenceDocument>(
    {
      user_id: {
        type: Schema.Types.ObjectId,
        ref: modelsName.USER,
        required: true,
        unique: true,
        index: true,
      },
      channels: {
        [NotificationChannel.IN_APP]: {
          type: Boolean,
          default: true,
        },
        [NotificationChannel.EMAIL]: {
          type: Boolean,
          default: true,
        },
        [NotificationChannel.PUSH]: {
          type: Boolean,
          default: true,
        },
      },
      muted_types: {
        type: [String],
        enum: Object.values(NotificationType),
        default: [],
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
      collection: modelsName.NOTIFICATION_PREFERENCE,
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

export const NotificationPreference =
  mongoose.model<INotificationPreferenceDocument>(
    modelsName.NOTIFICATION_PREFERENCE,
    notificationPreferenceSchema
  );
