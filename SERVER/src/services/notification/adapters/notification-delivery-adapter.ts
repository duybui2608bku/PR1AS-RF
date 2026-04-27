import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from "../../../constants/notification";
import type { INotificationDocument } from "../../../types/notification";

export interface NotificationDeliveryResult {
  status: NotificationDeliveryStatus;
  error?: string | null;
}

export interface NotificationDeliveryAdapter {
  channel: NotificationChannel;
  send(
    notification: INotificationDocument
  ): Promise<NotificationDeliveryResult>;
}
