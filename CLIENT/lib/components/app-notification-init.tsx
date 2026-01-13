"use client";

import { App, type AppProps } from "antd";
import { useEffect } from "react";
import { setNotificationApi } from "../utils/notification.service";

export function AppNotificationInit({ children }: AppProps) {
  const { notification } = App.useApp();

  useEffect(() => {
    setNotificationApi(notification);
  }, [notification]);

  return <>{children}</>;
}
