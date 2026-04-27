"use client";

import { App } from "antd";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { chatSocket } from "../socket";
import { useAuthStore } from "../stores/auth.store";
import { useNotificationStore } from "../stores/notification.store";
import {
  notificationQueryKeys,
  useUnreadNotificationCount,
} from "../hooks/use-notifications";
import type {
  RealtimeNotificationPayload,
  RealtimeUnreadCountPayload,
} from "../types/notification";

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { notification } = App.useApp();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setLatestNotification = useNotificationStore(
    (state) => state.setLatestNotification
  );
  const incrementUnreadCount = useNotificationStore(
    (state) => state.incrementUnreadCount
  );
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  const resetNotifications = useNotificationStore(
    (state) => state.resetNotifications
  );

  useUnreadNotificationCount();

  const invalidateNotificationQueries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
  }, [queryClient]);

  const handleNotificationNew = useCallback(
    (payload: RealtimeNotificationPayload) => {
      const item = payload.notification;
      setLatestNotification(item);
      incrementUnreadCount();
      invalidateNotificationQueries();

      notification.info({
        message: item.title,
        description: item.body,
        placement: "topRight",
        onClick: () => {
          if (item.link) {
            router.push(item.link);
          }
        },
      });
    },
    [
      incrementUnreadCount,
      invalidateNotificationQueries,
      notification,
      router,
      setLatestNotification,
    ]
  );

  const handleUnreadCount = useCallback(
    (payload: RealtimeUnreadCountPayload) => {
      setUnreadCount(payload.unread_count);
      void queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.unreadCount(),
      });
    },
    [queryClient, setUnreadCount]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      resetNotifications();
      return;
    }

    chatSocket.onNotificationNew(handleNotificationNew);
    chatSocket.onNotificationUnreadCount(handleUnreadCount);

    return () => {
      chatSocket.offNotificationNew(handleNotificationNew);
      chatSocket.offNotificationUnreadCount(handleUnreadCount);
    };
  }, [
    handleNotificationNew,
    handleUnreadCount,
    isAuthenticated,
    resetNotifications,
  ]);

  return <>{children}</>;
}
