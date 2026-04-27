import { Router } from "express";
import { notificationController } from "../../controllers/notification";
import { authenticate, AuthRequest } from "../../middleware/auth";
import { pagination } from "../../middleware";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.get(
  "/",
  authenticate,
  pagination({ defaultLimit: 20 }),
  asyncHandler<AuthRequest>(
    notificationController.listNotifications.bind(notificationController)
  )
);

router.get(
  "/unread-count",
  authenticate,
  asyncHandler<AuthRequest>(
    notificationController.getUnreadCount.bind(notificationController)
  )
);

router.get(
  "/preferences",
  authenticate,
  asyncHandler<AuthRequest>(
    notificationController.getPreferences.bind(notificationController)
  )
);

router.patch(
  "/preferences",
  authenticate,
  asyncHandler<AuthRequest>(
    notificationController.updatePreferences.bind(notificationController)
  )
);

router.get(
  "/push-public-key",
  authenticate,
  asyncHandler<AuthRequest>(
    notificationController.getPushPublicKey.bind(notificationController)
  )
);

router.post(
  "/push-subscriptions",
  authenticate,
  asyncHandler<AuthRequest>(
    notificationController.savePushSubscription.bind(notificationController)
  )
);

router.delete(
  "/push-subscriptions/:id",
  authenticate,
  asyncHandler<AuthRequest>(
    notificationController.deletePushSubscription.bind(notificationController)
  )
);

router.patch(
  "/read-all",
  authenticate,
  asyncHandler<AuthRequest>(
    notificationController.markAllAsRead.bind(notificationController)
  )
);

router.patch(
  "/:id/read",
  authenticate,
  asyncHandler<AuthRequest>(
    notificationController.markAsRead.bind(notificationController)
  )
);

export default router;
