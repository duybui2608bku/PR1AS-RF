export enum NotificationChannel {
  IN_APP = "in_app",
  EMAIL = "email",
  PUSH = "push",
}

export enum NotificationCategory {
  BOOKING = "booking",
  WALLET = "wallet",
  ESCROW = "escrow",
  CHAT = "chat",
  REVIEW = "review",
  DISPUTE = "dispute",
  SECURITY = "security",
  ADMIN = "admin",
  SYSTEM = "system",
}

export enum NotificationPriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  URGENT = "urgent",
}

export enum NotificationType {
  BOOKING_CREATED = "booking.created",
  BOOKING_STATUS_UPDATED = "booking.status_updated",
  BOOKING_UPDATED = "booking.updated",
  BOOKING_CANCELLED = "booking.cancelled",
  DISPUTE_CREATED = "dispute.created",
  DISPUTE_RESOLVED = "dispute.resolved",
  WALLET_DEPOSIT_SUCCESS = "wallet.deposit_success",
  WALLET_DEPOSIT_FAILED = "wallet.deposit_failed",
  WALLET_HOLD_CREATED = "wallet.hold_created",
  WALLET_REFUND_CREATED = "wallet.refund_created",
  WALLET_PAYOUT_CREATED = "wallet.payout_created",
  CHAT_MESSAGE = "chat.message",
  CHAT_GROUP_MESSAGE = "chat.group_message",
  REVIEW_CREATED = "review.created",
  REVIEW_UPDATED = "review.updated",
  SECURITY_ALERT = "security.alert",
  SYSTEM_ANNOUNCEMENT = "system.announcement",
}

export enum NotificationDeliveryStatus {
  PENDING = "pending",
  SENT = "sent",
  SKIPPED = "skipped",
  FAILED = "failed",
}

export const NOTIFICATION_MESSAGES = {
  NOTIFICATION_NOT_FOUND: "Notification not found",
  NOTIFICATIONS_FETCHED: "Notifications fetched successfully",
  NOTIFICATION_CREATED: "Notification created successfully",
  NOTIFICATION_MARKED_READ: "Notification marked as read",
  NOTIFICATIONS_MARKED_READ: "Notifications marked as read",
  UNREAD_COUNT_FETCHED: "Unread notification count fetched successfully",
  PREFERENCES_FETCHED: "Notification preferences fetched successfully",
  PREFERENCES_UPDATED: "Notification preferences updated successfully",
  PUSH_SUBSCRIPTION_SAVED: "Push subscription saved successfully",
  PUSH_SUBSCRIPTION_DELETED: "Push subscription deleted successfully",
} as const;

export const NOTIFICATION_LIMITS = {
  TITLE_MAX_LENGTH: 160,
  BODY_MAX_LENGTH: 1000,
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
