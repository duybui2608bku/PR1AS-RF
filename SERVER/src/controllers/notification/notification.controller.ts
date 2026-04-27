import { Response } from "express";
import { config } from "../../config";
import { AuthRequest } from "../../middleware/auth";
import { PaginationRequest } from "../../middleware";
import { notificationService } from "../../services/notification";
import {
  getNotificationsQuerySchema,
  pushSubscriptionSchema,
  updateNotificationPreferenceSchema,
} from "../../validations/notification";
import { COMMON_MESSAGES } from "../../constants/messages";
import { NOTIFICATION_MESSAGES } from "../../constants/notification";
import { R, extractUserIdFromRequest, validateWithSchema } from "../../utils";

export class NotificationController {
  async listNotifications(
    req: PaginationRequest,
    res: Response
  ): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const query = validateWithSchema(
      getNotificationsQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const { page, limit, skip } = req.pagination!;
    const result = await notificationService.listNotifications({
      ...query,
      recipient_id: userId,
      page,
      limit,
      skip,
    });
    R.success(res, result, NOTIFICATION_MESSAGES.NOTIFICATIONS_FETCHED, req);
  }

  async getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const result = await notificationService.getUnreadCount(userId);
    R.success(res, result, NOTIFICATION_MESSAGES.UNREAD_COUNT_FETCHED, req);
  }

  async markAsRead(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { id } = req.params;
    const result = await notificationService.markAsRead(id, userId);
    R.success(res, result, NOTIFICATION_MESSAGES.NOTIFICATION_MARKED_READ, req);
  }

  async markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const result = await notificationService.markAllAsRead(userId);
    R.success(
      res,
      result,
      NOTIFICATION_MESSAGES.NOTIFICATIONS_MARKED_READ,
      req
    );
  }

  async getPreferences(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const result = await notificationService.getPreferences(userId);
    R.success(res, result, NOTIFICATION_MESSAGES.PREFERENCES_FETCHED, req);
  }

  async updatePreferences(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const input = validateWithSchema(
      updateNotificationPreferenceSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await notificationService.updatePreferences(userId, input);
    R.success(res, result, NOTIFICATION_MESSAGES.PREFERENCES_UPDATED, req);
  }

  async savePushSubscription(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const input = validateWithSchema(
      pushSubscriptionSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await notificationService.savePushSubscription(userId, {
      ...input,
      user_agent: req.get("user-agent") || null,
    });
    R.created(res, result, NOTIFICATION_MESSAGES.PUSH_SUBSCRIPTION_SAVED, req);
  }

  async deletePushSubscription(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { id } = req.params;
    await notificationService.deletePushSubscription(userId, id);
    R.success(
      res,
      { deleted: true },
      NOTIFICATION_MESSAGES.PUSH_SUBSCRIPTION_DELETED,
      req
    );
  }

  getPushPublicKey(_req: AuthRequest, res: Response): void {
    R.success(res, {
      public_key: config.notification.vapidPublicKey,
      enabled: Boolean(config.notification.vapidPublicKey),
    });
  }
}

export const notificationController = new NotificationController();
