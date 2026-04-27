import webPush from "web-push";
import { config } from "../../../config";
import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from "../../../constants/notification";
import { notificationRepository } from "../../../repositories/notification";
import type { INotificationDocument } from "../../../types/notification";
import type {
  NotificationDeliveryAdapter,
  NotificationDeliveryResult,
} from "./notification-delivery-adapter";

const isWebPushConfigured = (): boolean =>
  Boolean(
    config.notification.vapidPublicKey &&
    config.notification.vapidPrivateKey &&
    config.notification.vapidSubject
  );

if (isWebPushConfigured()) {
  webPush.setVapidDetails(
    config.notification.vapidSubject,
    config.notification.vapidPublicKey,
    config.notification.vapidPrivateKey
  );
}

export class PushNotificationAdapter implements NotificationDeliveryAdapter {
  channel = NotificationChannel.PUSH;

  async send(
    notification: INotificationDocument
  ): Promise<NotificationDeliveryResult> {
    if (!isWebPushConfigured()) {
      return {
        status: NotificationDeliveryStatus.SKIPPED,
        error: "Web Push VAPID keys are not configured",
      };
    }

    const subscriptions =
      await notificationRepository.findActivePushSubscriptions(
        notification.recipient_id.toString()
      );

    if (subscriptions.length === 0) {
      return {
        status: NotificationDeliveryStatus.SKIPPED,
        error: "No active push subscription",
      };
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      data: notification.data,
      link: notification.link,
      notification_id: notification._id.toString(),
    });

    await Promise.all(
      subscriptions.map(async (subscription) => {
        const pushSubscription: webPush.PushSubscription = {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        };

        try {
          await webPush.sendNotification(pushSubscription, payload);
          await notificationRepository.updatePushSubscriptionLastUsed(
            subscription.endpoint
          );
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await notificationRepository.deactivatePushSubscriptionByEndpoint(
              subscription.endpoint
            );
          }
          throw error;
        }
      })
    );

    return { status: NotificationDeliveryStatus.SENT };
  }
}

export const pushNotificationAdapter = new PushNotificationAdapter();
