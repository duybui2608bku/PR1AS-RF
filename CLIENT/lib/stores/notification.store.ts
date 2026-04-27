import { create } from "zustand";
import type { AppNotification } from "../types/notification";

interface NotificationState {
  unreadCount: number;
  latestNotification: AppNotification | null;
  isPushSubscribed: boolean;
}

interface NotificationActions {
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  setLatestNotification: (notification: AppNotification | null) => void;
  setPushSubscribed: (isPushSubscribed: boolean) => void;
  resetNotifications: () => void;
}

export const useNotificationStore = create<
  NotificationState & NotificationActions
>((set) => ({
  unreadCount: 0,
  latestNotification: null,
  isPushSubscribed: false,

  setUnreadCount: (count) =>
    set({
      unreadCount: Math.max(0, count),
    }),

  incrementUnreadCount: () =>
    set((state) => ({
      unreadCount: state.unreadCount + 1,
    })),

  setLatestNotification: (notification) =>
    set({
      latestNotification: notification,
    }),

  setPushSubscribed: (isPushSubscribed) => set({ isPushSubscribed }),

  resetNotifications: () =>
    set({
      unreadCount: 0,
      latestNotification: null,
      isPushSubscribed: false,
    }),
}));
