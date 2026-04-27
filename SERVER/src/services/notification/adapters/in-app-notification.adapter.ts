import { getSocketIO } from "../../../config/socket";
import { SOCKET_EVENTS } from "../../../constants/socket";
import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from "../../../constants/notification";
import { getUserRoom } from "../../../utils/chat.helper";
import { logger } from "../../../utils/logger";
import { notificationRepository } from "../../../repositories/notification";
import type { INotificationDocument } from "../../../types/notification";
import type {
  NotificationDeliveryAdapter,
  NotificationDeliveryResult,
} from "./notification-delivery-adapter";

export class InAppNotificationAdapter implements NotificationDeliveryAdapter {
  channel = NotificationChannel.IN_APP;

  async send(
    notification: INotificationDocument
  ): Promise<NotificationDeliveryResult> {
    const recipientId = notification.recipient_id.toString();
    try {
      const io = getSocketIO();
      io.to(getUserRoom(recipientId)).emit(SOCKET_EVENTS.NOTIFICATION_NEW, {
        notification,
      });

      const unreadCount =
        await notificationRepository.getUnreadCount(recipientId);
      io.to(getUserRoom(recipientId)).emit(
        SOCKET_EVENTS.NOTIFICATION_UNREAD_COUNT,
        {
          unread_count: unreadCount,
        }
      );
    } catch (error) {
      logger.warn("Unable to emit in-app notification:", error);
    }

    return { status: NotificationDeliveryStatus.SENT };
  }
}

export const inAppNotificationAdapter = new InAppNotificationAdapter();
