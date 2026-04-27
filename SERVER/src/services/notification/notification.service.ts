import { getSocketIO } from "../../config/socket";
import { SOCKET_EVENTS } from "../../constants/socket";
import {
  NotificationCategory,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationPriority,
  NotificationType,
} from "../../constants/notification";
import { AppError } from "../../utils/AppError";
import { PaginationHelper } from "../../utils/pagination";
import { getUserRoom } from "../../utils/chat.helper";
import { logger } from "../../utils/logger";
import { notificationRepository } from "../../repositories/notification";
import {
  emailNotificationAdapter,
  inAppNotificationAdapter,
  pushNotificationAdapter,
  type NotificationDeliveryAdapter,
} from "./adapters";
import type {
  INotificationDocument,
  INotificationPreferenceDocument,
  NotificationPreferenceInput,
  NotificationQuery,
  NotifyInput,
  PushSubscriptionInput,
} from "../../types/notification";
import { NOTIFICATION_MESSAGES } from "../../constants/notification";

interface NotificationTypeConfig {
  category: NotificationCategory;
  priority: NotificationPriority;
  channels: NotificationChannel[];
}

const DEFAULT_TYPE_CONFIG: NotificationTypeConfig = {
  category: NotificationCategory.SYSTEM,
  priority: NotificationPriority.NORMAL,
  channels: [NotificationChannel.IN_APP],
};

const NOTIFICATION_TYPE_CONFIG: Partial<
  Record<NotificationType, NotificationTypeConfig>
> = {
  [NotificationType.BOOKING_CREATED]: {
    category: NotificationCategory.BOOKING,
    priority: NotificationPriority.HIGH,
    channels: [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.PUSH,
    ],
  },
  [NotificationType.BOOKING_STATUS_UPDATED]: {
    category: NotificationCategory.BOOKING,
    priority: NotificationPriority.HIGH,
    channels: [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.PUSH,
    ],
  },
  [NotificationType.BOOKING_CANCELLED]: {
    category: NotificationCategory.BOOKING,
    priority: NotificationPriority.HIGH,
    channels: [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.PUSH,
    ],
  },
  [NotificationType.DISPUTE_CREATED]: {
    category: NotificationCategory.DISPUTE,
    priority: NotificationPriority.URGENT,
    channels: [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.PUSH,
    ],
  },
  [NotificationType.DISPUTE_RESOLVED]: {
    category: NotificationCategory.DISPUTE,
    priority: NotificationPriority.HIGH,
    channels: [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.PUSH,
    ],
  },
  [NotificationType.WALLET_DEPOSIT_SUCCESS]: {
    category: NotificationCategory.WALLET,
    priority: NotificationPriority.HIGH,
    channels: [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.PUSH,
    ],
  },
  [NotificationType.WALLET_DEPOSIT_FAILED]: {
    category: NotificationCategory.WALLET,
    priority: NotificationPriority.HIGH,
    channels: [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.PUSH,
    ],
  },
  [NotificationType.CHAT_MESSAGE]: {
    category: NotificationCategory.CHAT,
    priority: NotificationPriority.NORMAL,
    channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
  },
  [NotificationType.CHAT_GROUP_MESSAGE]: {
    category: NotificationCategory.CHAT,
    priority: NotificationPriority.NORMAL,
    channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
  },
};

export class NotificationService {
  private readonly adapters: Record<
    NotificationChannel,
    NotificationDeliveryAdapter
  > = {
    [NotificationChannel.IN_APP]: inAppNotificationAdapter,
    [NotificationChannel.EMAIL]: emailNotificationAdapter,
    [NotificationChannel.PUSH]: pushNotificationAdapter,
  };

  async notify(input: NotifyInput): Promise<INotificationDocument[]> {
    const uniqueRecipientIds = Array.from(new Set(input.recipient_ids)).filter(
      Boolean
    );

    if (uniqueRecipientIds.length === 0) {
      return [];
    }

    const typeConfig = NOTIFICATION_TYPE_CONFIG[input.type] || {
      ...DEFAULT_TYPE_CONFIG,
      category: input.category,
    };

    const notifications = await Promise.all(
      uniqueRecipientIds.map(async (recipientId) => {
        const preference =
          await notificationRepository.getOrCreatePreference(recipientId);
        const channels = this.resolveChannels(input, typeConfig, preference);

        if (channels.length === 0) {
          return null;
        }

        const notification = await notificationRepository.createNotification({
          ...input,
          recipient_id: recipientId,
          category: input.category || typeConfig.category,
          priority: input.priority || typeConfig.priority,
          channels,
          dedupe_key: input.dedupe_key
            ? `${input.dedupe_key}:${recipientId}`
            : null,
        });

        void this.dispatchChannels(notification).catch((error) => {
          logger.error("Notification dispatch failed:", error);
        });

        return notification;
      })
    );

    return notifications.filter(
      (notification): notification is INotificationDocument =>
        notification !== null
    );
  }

  async listNotifications(query: NotificationQuery) {
    const { notifications, total } =
      await notificationRepository.listNotifications(query);
    return PaginationHelper.formatResponse(
      notifications,
      query.page,
      query.limit,
      total
    );
  }

  async getUnreadCount(userId: string): Promise<{ unread_count: number }> {
    return {
      unread_count: await notificationRepository.getUnreadCount(userId),
    };
  }

  async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<INotificationDocument> {
    const notification = await notificationRepository.markAsRead(
      notificationId,
      userId
    );

    if (!notification) {
      throw AppError.notFound(NOTIFICATION_MESSAGES.NOTIFICATION_NOT_FOUND);
    }

    await this.emitUnreadCount(userId);
    this.emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_READ, {
      notification_id: notificationId,
      read_at: notification.read_at,
    });

    return notification;
  }

  async markAllAsRead(userId: string): Promise<{ updated_count: number }> {
    const updatedCount = await notificationRepository.markAllAsRead(userId);
    await this.emitUnreadCount(userId);
    this.emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_READ, {
      all: true,
      read_at: new Date(),
    });
    return { updated_count: updatedCount };
  }

  async getPreferences(
    userId: string
  ): Promise<INotificationPreferenceDocument> {
    return notificationRepository.getOrCreatePreference(userId);
  }

  async updatePreferences(
    userId: string,
    input: NotificationPreferenceInput
  ): Promise<INotificationPreferenceDocument> {
    return notificationRepository.updatePreference(userId, input);
  }

  async savePushSubscription(userId: string, input: PushSubscriptionInput) {
    return notificationRepository.savePushSubscription(userId, input);
  }

  async deletePushSubscription(
    userId: string,
    subscriptionId: string
  ): Promise<void> {
    const subscription =
      await notificationRepository.deactivatePushSubscription(
        userId,
        subscriptionId
      );

    if (!subscription) {
      throw AppError.notFound(NOTIFICATION_MESSAGES.NOTIFICATION_NOT_FOUND);
    }
  }

  private resolveChannels(
    input: NotifyInput,
    typeConfig: NotificationTypeConfig,
    preference: INotificationPreferenceDocument
  ): NotificationChannel[] {
    if (preference.muted_types.includes(input.type)) {
      return [];
    }

    const requestedChannels = input.channels || typeConfig.channels;
    return requestedChannels.filter(
      (channel) => preference.channels[channel] !== false
    );
  }

  private async dispatchChannels(
    notification: INotificationDocument
  ): Promise<void> {
    await Promise.all(
      notification.channels.map(async (channel) => {
        try {
          const result = await this.adapters[channel].send(notification);
          await this.recordDeliveryStatus(
            notification,
            channel,
            result.status,
            result.error
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown delivery error";
          await this.recordDeliveryStatus(
            notification,
            channel,
            NotificationDeliveryStatus.FAILED,
            errorMessage
          );
        }
      })
    );
  }

  private async recordDeliveryStatus(
    notification: INotificationDocument,
    channel: NotificationChannel,
    status: NotificationDeliveryStatus,
    error?: string | null
  ): Promise<void> {
    const notificationId = notification._id.toString();
    const recipientId = notification.recipient_id.toString();

    await Promise.all([
      notificationRepository.updateDeliveryStatus(
        notificationId,
        channel,
        status,
        error
      ),
      notificationRepository.createDeliveryLog({
        notification_id: notificationId,
        recipient_id: recipientId,
        channel,
        status,
        provider: this.getProviderName(channel),
        error,
      }),
    ]);
  }

  private emitToUser(
    userId: string,
    event: (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS],
    payload: unknown
  ): void {
    try {
      getSocketIO().to(getUserRoom(userId)).emit(event, payload);
    } catch (error) {
      logger.warn("Unable to emit notification socket event:", error);
    }
  }

  private async emitUnreadCount(userId: string): Promise<void> {
    const unreadCount = await notificationRepository.getUnreadCount(userId);
    this.emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_UNREAD_COUNT, {
      unread_count: unreadCount,
    });
  }

  private getProviderName(channel: NotificationChannel): string {
    const providerByChannel: Record<NotificationChannel, string> = {
      [NotificationChannel.IN_APP]: "socket.io",
      [NotificationChannel.EMAIL]: "nodemailer",
      [NotificationChannel.PUSH]: "web-push",
    };
    return providerByChannel[channel];
  }
}

export const notificationService = new NotificationService();
