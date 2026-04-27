"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "../api/notification.api";
import { useAuthStore } from "../stores/auth.store";
import { useNotificationStore } from "../stores/notification.store";
import type {
  NotificationListQuery,
  UpdateNotificationPreferencesInput,
} from "../types/notification";

export const notificationQueryKeys = {
  all: ["notifications"] as const,
  list: (query?: NotificationListQuery) =>
    [...notificationQueryKeys.all, "list", query || {}] as const,
  unreadCount: () => [...notificationQueryKeys.all, "unread-count"] as const,
  preferences: () => [...notificationQueryKeys.all, "preferences"] as const,
};

export function useNotifications(query?: NotificationListQuery) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: notificationQueryKeys.list(query),
    queryFn: () => notificationApi.getNotifications(query),
    enabled: isAuthenticated,
  });
}

export function useUnreadNotificationCount() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  return useQuery({
    queryKey: notificationQueryKeys.unreadCount(),
    queryFn: async () => {
      const response = await notificationApi.getUnreadCount();
      setUnreadCount(response.unread_count);
      return response;
    },
    enabled: isAuthenticated,
  });
}

export function useNotificationPreferences() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: notificationQueryKeys.preferences(),
    queryFn: notificationApi.getPreferences,
    enabled: isAuthenticated,
  });
}

export function useNotificationMutations() {
  const queryClient = useQueryClient();
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

  const invalidateNotifications = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all }),
      queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.unreadCount(),
      }),
    ]);
  };

  const markAsRead = useMutation({
    mutationFn: notificationApi.markAsRead,
    onSuccess: () => {
      void invalidateNotifications();
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: notificationApi.markAllAsRead,
    onSuccess: () => {
      setUnreadCount(0);
      void invalidateNotifications();
    },
  });

  const updatePreferences = useMutation({
    mutationFn: (input: UpdateNotificationPreferencesInput) =>
      notificationApi.updatePreferences(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.preferences(),
      });
    },
  });

  return {
    markAsRead,
    markAllAsRead,
    updatePreferences,
  };
}
