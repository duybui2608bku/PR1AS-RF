import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from "../../../constants/notification";
import { userRepository } from "../../../repositories/auth/user.repository";
import nodemailerUtils from "../../../utils/nodemailer";
import type { INotificationDocument } from "../../../types/notification";
import type {
  NotificationDeliveryAdapter,
  NotificationDeliveryResult,
} from "./notification-delivery-adapter";

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export class EmailNotificationAdapter implements NotificationDeliveryAdapter {
  channel = NotificationChannel.EMAIL;

  async send(
    notification: INotificationDocument
  ): Promise<NotificationDeliveryResult> {
    const recipient = await userRepository.findById(
      notification.recipient_id.toString()
    );

    if (!recipient?.email) {
      return {
        status: NotificationDeliveryStatus.SKIPPED,
        error: "Recipient email not found",
      };
    }

    await nodemailerUtils({
      email: recipient.email,
      subject: notification.title,
      html: `<p>${escapeHtml(notification.body)}</p>`,
    });

    return { status: NotificationDeliveryStatus.SENT };
  }
}

export const emailNotificationAdapter = new EmailNotificationAdapter();
