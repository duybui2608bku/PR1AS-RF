import { z } from "zod";
import {
  NotificationCategory,
  NotificationChannel,
  NotificationType,
} from "../../constants/notification";

const booleanQuerySchema = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => {
    if (value === undefined || typeof value === "boolean") {
      return value;
    }
    return value === "true";
  });

export const getNotificationsQuerySchema = z.object({
  unread: booleanQuerySchema,
  category: z.nativeEnum(NotificationCategory).optional(),
  type: z.nativeEnum(NotificationType).optional(),
});

export const updateNotificationPreferenceSchema = z.object({
  channels: z
    .object({
      [NotificationChannel.IN_APP]: z.boolean().optional(),
      [NotificationChannel.EMAIL]: z.boolean().optional(),
      [NotificationChannel.PUSH]: z.boolean().optional(),
    })
    .optional(),
  muted_types: z.array(z.nativeEnum(NotificationType)).optional(),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export type GetNotificationsQuerySchemaType = z.infer<
  typeof getNotificationsQuerySchema
>;
export type UpdateNotificationPreferenceSchemaType = z.infer<
  typeof updateNotificationPreferenceSchema
>;
export type PushSubscriptionSchemaType = z.infer<typeof pushSubscriptionSchema>;
