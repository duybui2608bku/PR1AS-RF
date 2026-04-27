export type NotificationChannel = "in_app" | "email" | "push";

export type NotificationCategory =
  | "booking"
  | "wallet"
  | "escrow"
  | "chat"
  | "review"
  | "dispute"
  | "security"
  | "admin"
  | "system";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export type NotificationType =
  | "booking.created"
  | "booking.status_updated"
  | "booking.cancelled"
  | "dispute.created"
  | "dispute.resolved"
  | "wallet.deposit_success"
  | "wallet.deposit_failed"
  | "wallet.hold_created"
  | "wallet.refund_created"
  | "wallet.payout_created"
  | "chat.message"
  | "chat.group_message"
  | "review.created"
  | "review.updated"
  | "security.alert"
  | "system.announcement";

export interface AppNotification {
  id?: string;
  _id?: string;
  recipient_id: string;
  actor_id?: string | null;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  data: Record<string, unknown>;
  link?: string | null;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  read_at?: string | null;
  archived_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationListQuery {
  page?: number;
  limit?: number;
  unread?: boolean;
  category?: NotificationCategory;
  type?: NotificationType;
}

export interface NotificationListResponse {
  data: AppNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface UnreadNotificationCountResponse {
  unread_count: number;
}

export interface NotificationPreferences {
  id?: string;
  user_id: string;
  channels: Record<NotificationChannel, boolean>;
  muted_types: NotificationType[];
  created_at: string;
  updated_at: string;
}

export interface UpdateNotificationPreferencesInput {
  channels?: Partial<Record<NotificationChannel, boolean>>;
  muted_types?: NotificationType[];
}

export interface WebPushKeys {
  p256dh: string;
  auth: string;
}

export interface SavePushSubscriptionInput {
  endpoint: string;
  keys: WebPushKeys;
}

export interface PushPublicKeyResponse {
  public_key: string;
  enabled: boolean;
}

export interface RealtimeNotificationPayload {
  notification: AppNotification;
}

export interface RealtimeUnreadCountPayload {
  unread_count: number;
}
