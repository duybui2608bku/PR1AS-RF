"use client";

import { useMutation } from "@tanstack/react-query";
import { useNotificationStore } from "../stores/notification.store";
import {
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "../utils/push-notifications";

export function usePushNotifications() {
  const setPushSubscribed = useNotificationStore(
    (state) => state.setPushSubscribed
  );

  const subscribe = useMutation({
    mutationFn: subscribeToPushNotifications,
    onSuccess: (isSubscribed) => {
      setPushSubscribed(isSubscribed);
    },
  });

  const unsubscribe = useMutation({
    mutationFn: unsubscribeFromPushNotifications,
    onSuccess: (isUnsubscribed) => {
      if (isUnsubscribed) {
        setPushSubscribed(false);
      }
    },
  });

  return {
    subscribe,
    unsubscribe,
  };
}
