export enum NotificationChannel {
  IN_APP = "in_app",
  EMAIL = "email",
  PUSH = "push",
}

export enum NotificationCategory {
  BOOKING = "booking",
  WALLET = "wallet",
  CHAT = "chat",
  REVIEW = "review",
  DISPUTE = "dispute",
  SECURITY = "security",
  ADMIN = "admin",
  SYSTEM = "system",
  REPUTATION = "reputation",
  QUESTION = "question",
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
  BOOKING_REMINDER = "booking.reminder",
  DISPUTE_CREATED = "dispute.created",
  DISPUTE_RESOLVED = "dispute.resolved",
  WALLET_DEPOSIT_SUCCESS = "wallet.deposit_success",
  WALLET_DEPOSIT_FAILED = "wallet.deposit_failed",
  WALLET_HOLD_CREATED = "wallet.hold_created",
  WALLET_REFUND_CREATED = "wallet.refund_created",
  CHAT_MESSAGE = "chat.message",
  CHAT_GROUP_MESSAGE = "chat.group_message",
  REVIEW_CREATED = "review.created",
  REVIEW_UPDATED = "review.updated",
  SECURITY_ALERT = "security.alert",
  ACCOUNT_BANNED = "account.banned",
  ACCOUNT_UNBANNED = "account.unbanned",
  SYSTEM_ANNOUNCEMENT = "system.announcement",
  REPUTATION_WARNING = "reputation.warning",
  MODERATION_POST_DELETED = "moderation.post_deleted",
  MODERATION_REPORT_RESOLVED = "moderation.report_resolved",
  MODERATION_RESTRICTION_APPLIED = "moderation.restriction_applied",
  WORKER_QUESTION_CREATED = "worker_question.created",
  WORKER_QUESTION_ANSWERED = "worker_question.answered",
  SERVICE_DEPRECATED = "service.deprecated",
  SERVICE_ADDED = "service.added",
}

export enum NotificationDeliveryStatus {
  PENDING = "pending",
  SENT = "sent",
  SKIPPED = "skipped",
  FAILED = "failed",
}

export const NOTIFICATION_MESSAGES = {
  NOTIFICATION_NOT_FOUND: "Không tìm thấy thông báo",
  NOTIFICATIONS_FETCHED: "Lấy danh sách thông báo thành công",
  NOTIFICATION_CREATED: "Tạo thông báo thành công",
  NOTIFICATION_MARKED_READ: "Đã đánh dấu thông báo là đã đọc",
  NOTIFICATIONS_MARKED_READ: "Đã đánh dấu tất cả thông báo là đã đọc",
  UNREAD_COUNT_FETCHED: "Lấy số thông báo chưa đọc thành công",
  PREFERENCES_FETCHED: "Lấy tùy chọn thông báo thành công",
  PREFERENCES_UPDATED: "Cập nhật tùy chọn thông báo thành công",
  PUSH_SUBSCRIPTION_SAVED: "Đăng ký nhận thông báo đẩy thành công",
  PUSH_SUBSCRIPTION_DELETED: "Hủy đăng ký nhận thông báo đẩy thành công",
} as const;

export const NOTIFICATION_LIMITS = {
  TITLE_MAX_LENGTH: 160,
  BODY_MAX_LENGTH: 1000,
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
