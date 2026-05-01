"use client";

import { App } from "antd";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { chatSocket } from "../socket";
import { useAuthStore } from "../stores/auth.store";
import { useNotificationStore } from "../stores/notification.store";
import {
  notificationQueryKeys,
  useUnreadNotificationCount,
} from "../hooks/use-notifications";
import type {
  AppNotification,
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
  const { t } = useTranslation();
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

  const getLocalizedNotificationContent = useCallback(
    (item: AppNotification): { title: string; description: string } => {
      const status =
        typeof item.data?.status === "string"
          ? item.data.status
          : undefined;

      const statusLabel = status
        ? t(`booking.status.${status}`, { defaultValue: status })
        : "";

      switch (item.type) {
        case "booking.created":
          return {
            title: t("notifications.events.booking.created.title", {
              defaultValue: item.title,
            }),
            description: t("notifications.events.booking.created.body", {
              defaultValue: item.body,
            }),
          };
        case "booking.status_updated":
          return {
            title: t("notifications.events.booking.statusUpdated.title", {
              status: statusLabel || status,
              defaultValue: item.title,
            }),
            description: t("notifications.events.booking.statusUpdated.body", {
              status: statusLabel || status,
              defaultValue: item.body,
            }),
          };
        case "booking.cancelled":
          return {
            title: t("notifications.events.booking.cancelled.title", {
              defaultValue: item.title,
            }),
            description: t("notifications.events.booking.cancelled.body", {
              defaultValue: item.body,
            }),
          };
        case "dispute.created":
          return {
            title: t("notifications.events.dispute.created.title", {
              defaultValue: item.title,
            }),
            description: t("notifications.events.dispute.created.body", {
              defaultValue: item.body,
            }),
          };
        case "dispute.resolved":
          return {
            title: t("notifications.events.dispute.resolved.title", {
              defaultValue: item.title,
            }),
            description: t("notifications.events.dispute.resolved.body", {
              defaultValue: item.body,
            }),
          };
        default:
          return {
            title: item.title,
            description: item.body,
          };
      }
    },
    [t]
  );

  const handleNotificationNew = useCallback(
    (payload: RealtimeNotificationPayload) => {
      const item = payload.notification;
      const localizedContent = getLocalizedNotificationContent(item);
      setLatestNotification(item);
      incrementUnreadCount();
      invalidateNotificationQueries();

      notification.info({
        message: localizedContent.title,
        description: localizedContent.description,
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
      getLocalizedNotificationContent,
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
