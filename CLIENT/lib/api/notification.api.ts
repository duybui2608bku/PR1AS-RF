"use client";

import { api, extractData } from "../axios/index";
import type { ApiResponse } from "../axios";
import { ApiEndpoint, buildEndpoint } from "../constants/api-endpoints";
import type {
  AppNotification,
  NotificationListQuery,
  NotificationListResponse,
  NotificationPreferences,
  PushPublicKeyResponse,
  SavePushSubscriptionInput,
  UnreadNotificationCountResponse,
  UpdateNotificationPreferencesInput,
} from "../types/notification";

export const notificationApi = {
  getNotifications: async (
    query?: NotificationListQuery
  ): Promise<NotificationListResponse> => {
    const response = await api.get<ApiResponse<NotificationListResponse>>(
      ApiEndpoint.NOTIFICATIONS,
      { params: query }
    );
    return extractData(response);
  },

  getUnreadCount: async (): Promise<UnreadNotificationCountResponse> => {
    const response = await api.get<ApiResponse<UnreadNotificationCountResponse>>(
      ApiEndpoint.NOTIFICATIONS_UNREAD_COUNT
    );
    return extractData(response);
  },

  markAsRead: async (notificationId: string): Promise<AppNotification> => {
    const response = await api.patch<ApiResponse<AppNotification>>(
      buildEndpoint(ApiEndpoint.NOTIFICATIONS_BY_ID_READ, {
        id: notificationId,
      })
    );
    return extractData(response);
  },

  markAllAsRead: async (): Promise<{ updated_count: number }> => {
    const response = await api.patch<ApiResponse<{ updated_count: number }>>(
      ApiEndpoint.NOTIFICATIONS_READ_ALL
    );
    return extractData(response);
  },

  getPreferences: async (): Promise<NotificationPreferences> => {
    const response = await api.get<ApiResponse<NotificationPreferences>>(
      ApiEndpoint.NOTIFICATIONS_PREFERENCES
    );
    return extractData(response);
  },

  updatePreferences: async (
    input: UpdateNotificationPreferencesInput
  ): Promise<NotificationPreferences> => {
    const response = await api.patch<ApiResponse<NotificationPreferences>>(
      ApiEndpoint.NOTIFICATIONS_PREFERENCES,
      input
    );
    return extractData(response);
  },

  getPushPublicKey: async (): Promise<PushPublicKeyResponse> => {
    const response = await api.get<ApiResponse<PushPublicKeyResponse>>(
      ApiEndpoint.NOTIFICATIONS_PUSH_PUBLIC_KEY
    );
    return extractData(response);
  },

  savePushSubscription: async (
    input: SavePushSubscriptionInput
  ): Promise<unknown> => {
    const response = await api.post<ApiResponse<unknown>>(
      ApiEndpoint.NOTIFICATIONS_PUSH_SUBSCRIPTIONS,
      input
    );
    return extractData(response);
  },

  deletePushSubscription: async (subscriptionId: string): Promise<void> => {
    await api.delete(
      buildEndpoint(ApiEndpoint.NOTIFICATIONS_PUSH_SUBSCRIPTIONS_BY_ID, {
        id: subscriptionId,
      })
    );
  },
};
