import { Document, Types } from "mongoose";
import {
  NotificationCategory,
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationPriority,
  NotificationType,
} from "../../constants/notification";

export type NotificationData = Record<string, unknown>;

export interface NotificationChannelStatus {
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  attempted_at?: Date | null;
  error?: string | null;
}

export interface INotification {
  recipient_id: Types.ObjectId;
  actor_id?: Types.ObjectId | null;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  data: NotificationData;
  link?: string | null;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  delivery: NotificationChannelStatus[];
  dedupe_key?: string | null;
  read_at?: Date | null;
  archived_at?: Date | null;
  expires_at?: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface INotificationDocument extends INotification, Document {}

export interface INotificationPreference {
  user_id: Types.ObjectId;
  channels: Record<NotificationChannel, boolean>;
  muted_types: NotificationType[];
  created_at: Date;
  updated_at: Date;
}

export interface INotificationPreferenceDocument
  extends INotificationPreference, Document {}

export interface IWebPushKeys {
  p256dh: string;
  auth: string;
}

export interface IPushSubscription {
  user_id: Types.ObjectId;
  endpoint: string;
  keys: IWebPushKeys;
  user_agent?: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_used_at?: Date | null;
}

export interface IPushSubscriptionDocument
  extends IPushSubscription, Document {}

export interface INotificationDeliveryLog {
  notification_id: Types.ObjectId;
  recipient_id: Types.ObjectId;
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  provider?: string | null;
  error?: string | null;
  metadata?: NotificationData;
  created_at: Date;
}

export interface INotificationDeliveryLogDocument
  extends INotificationDeliveryLog, Document {}

export interface NotificationQuery {
  recipient_id: string;
  unread?: boolean;
  category?: NotificationCategory;
  type?: NotificationType;
  page: number;
  limit: number;
  skip: number;
}

export interface NotificationListResult {
  notifications: INotificationDocument[];
  total: number;
}

export interface NotificationPreferenceInput {
  channels?: Partial<Record<NotificationChannel, boolean>>;
  muted_types?: NotificationType[];
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: IWebPushKeys;
  user_agent?: string | null;
}

export interface NotifyInput {
  recipient_ids: string[];
  actor_id?: string | null;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  data?: NotificationData;
  link?: string | null;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  dedupe_key?: string | null;
  expires_at?: Date | null;
}
