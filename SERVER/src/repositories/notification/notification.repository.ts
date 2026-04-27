import { Types } from "mongoose";
import {
  Notification,
  NotificationDeliveryLog,
  NotificationPreference,
  PushSubscription,
} from "../../models/notification";
import {
  NotificationChannel,
  NotificationDeliveryStatus,
} from "../../constants/notification";
import type {
  INotificationDocument,
  INotificationPreferenceDocument,
  IPushSubscriptionDocument,
  INotificationDeliveryLogDocument,
  NotificationListResult,
  NotificationPreferenceInput,
  NotificationQuery,
  NotifyInput,
  PushSubscriptionInput,
} from "../../types/notification";

const DEFAULT_CHANNELS: Record<NotificationChannel, boolean> = {
  [NotificationChannel.IN_APP]: true,
  [NotificationChannel.EMAIL]: true,
  [NotificationChannel.PUSH]: true,
};

export class NotificationRepository {
  async createNotification(
    data: NotifyInput & { recipient_id: string }
  ): Promise<INotificationDocument> {
    const now = new Date();
    const notificationData = {
      recipient_id: new Types.ObjectId(data.recipient_id),
      actor_id: data.actor_id ? new Types.ObjectId(data.actor_id) : null,
      type: data.type,
      category: data.category,
      title: data.title,
      body: data.body,
      data: data.data || {},
      link: data.link || null,
      priority: data.priority,
      channels: data.channels,
      delivery: (data.channels || []).map((channel) => ({
        channel,
        status: NotificationDeliveryStatus.PENDING,
        attempted_at: null,
        error: null,
      })),
      dedupe_key: data.dedupe_key || null,
      expires_at: data.expires_at || null,
      read_at: null,
      archived_at: null,
      created_at: now,
      updated_at: now,
    };

    if (data.dedupe_key) {
      return Notification.findOneAndUpdate(
        {
          recipient_id: notificationData.recipient_id,
          dedupe_key: data.dedupe_key,
        },
        {
          $setOnInsert: notificationData,
          $set: { updated_at: now },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ) as Promise<INotificationDocument>;
    }

    return new Notification(notificationData).save();
  }

  async listNotifications(
    query: NotificationQuery
  ): Promise<NotificationListResult> {
    const filter: Record<string, unknown> = {
      recipient_id: new Types.ObjectId(query.recipient_id),
      archived_at: null,
      $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }],
    };

    if (query.unread !== undefined) {
      filter.read_at = query.unread ? null : { $ne: null };
    }

    if (query.category) {
      filter.category = query.category;
    }

    if (query.type) {
      filter.type = query.type;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ created_at: -1 })
        .skip(query.skip)
        .limit(query.limit),
      Notification.countDocuments(filter),
    ]);

    return { notifications, total };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({
      recipient_id: new Types.ObjectId(userId),
      read_at: null,
      archived_at: null,
      $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }],
    });
  }

  async findByIdForUser(
    notificationId: string,
    userId: string
  ): Promise<INotificationDocument | null> {
    return Notification.findOne({
      _id: new Types.ObjectId(notificationId),
      recipient_id: new Types.ObjectId(userId),
    });
  }

  async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<INotificationDocument | null> {
    return Notification.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        recipient_id: new Types.ObjectId(userId),
      },
      {
        read_at: new Date(),
        updated_at: new Date(),
      },
      { new: true }
    );
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await Notification.updateMany(
      {
        recipient_id: new Types.ObjectId(userId),
        read_at: null,
        archived_at: null,
      },
      {
        read_at: new Date(),
        updated_at: new Date(),
      }
    );

    return result.modifiedCount;
  }

  async updateDeliveryStatus(
    notificationId: string,
    channel: NotificationChannel,
    status: NotificationDeliveryStatus,
    error?: string | null
  ): Promise<void> {
    await Notification.updateOne(
      {
        _id: new Types.ObjectId(notificationId),
        "delivery.channel": channel,
      },
      {
        $set: {
          "delivery.$.status": status,
          "delivery.$.attempted_at": new Date(),
          "delivery.$.error": error || null,
          updated_at: new Date(),
        },
      }
    );
  }

  async getOrCreatePreference(
    userId: string
  ): Promise<INotificationPreferenceDocument> {
    return NotificationPreference.findOneAndUpdate(
      { user_id: new Types.ObjectId(userId) },
      {
        $setOnInsert: {
          user_id: new Types.ObjectId(userId),
          channels: DEFAULT_CHANNELS,
          muted_types: [],
          created_at: new Date(),
        },
        $set: { updated_at: new Date() },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ) as Promise<INotificationPreferenceDocument>;
  }

  async updatePreference(
    userId: string,
    input: NotificationPreferenceInput
  ): Promise<INotificationPreferenceDocument> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (input.channels) {
      Object.entries(input.channels).forEach(([channel, enabled]) => {
        updateData[`channels.${channel}`] = enabled;
      });
    }

    if (input.muted_types) {
      updateData.muted_types = input.muted_types;
    }

    return NotificationPreference.findOneAndUpdate(
      { user_id: new Types.ObjectId(userId) },
      {
        $setOnInsert: {
          user_id: new Types.ObjectId(userId),
          channels: DEFAULT_CHANNELS,
          created_at: new Date(),
        },
        $set: updateData,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ) as Promise<INotificationPreferenceDocument>;
  }

  async savePushSubscription(
    userId: string,
    input: PushSubscriptionInput
  ): Promise<IPushSubscriptionDocument> {
    const now = new Date();
    return PushSubscription.findOneAndUpdate(
      { endpoint: input.endpoint },
      {
        $set: {
          user_id: new Types.ObjectId(userId),
          endpoint: input.endpoint,
          keys: input.keys,
          user_agent: input.user_agent || null,
          is_active: true,
          updated_at: now,
        },
        $setOnInsert: {
          created_at: now,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ) as Promise<IPushSubscriptionDocument>;
  }

  async deactivatePushSubscription(
    userId: string,
    subscriptionId: string
  ): Promise<IPushSubscriptionDocument | null> {
    return PushSubscription.findOneAndUpdate(
      {
        _id: new Types.ObjectId(subscriptionId),
        user_id: new Types.ObjectId(userId),
      },
      {
        is_active: false,
        updated_at: new Date(),
      },
      { new: true }
    );
  }

  async deactivatePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
    await PushSubscription.updateOne(
      { endpoint },
      {
        is_active: false,
        updated_at: new Date(),
      }
    );
  }

  async findActivePushSubscriptions(
    userId: string
  ): Promise<IPushSubscriptionDocument[]> {
    return PushSubscription.find({
      user_id: new Types.ObjectId(userId),
      is_active: true,
    });
  }

  async updatePushSubscriptionLastUsed(endpoint: string): Promise<void> {
    await PushSubscription.updateOne(
      { endpoint },
      {
        last_used_at: new Date(),
        updated_at: new Date(),
      }
    );
  }

  async createDeliveryLog(data: {
    notification_id: string;
    recipient_id: string;
    channel: NotificationChannel;
    status: NotificationDeliveryStatus;
    provider?: string | null;
    error?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<INotificationDeliveryLogDocument> {
    return new NotificationDeliveryLog({
      notification_id: new Types.ObjectId(data.notification_id),
      recipient_id: new Types.ObjectId(data.recipient_id),
      channel: data.channel,
      status: data.status,
      provider: data.provider || null,
      error: data.error || null,
      metadata: data.metadata || {},
      created_at: new Date(),
    }).save();
  }
}

export const notificationRepository = new NotificationRepository();
