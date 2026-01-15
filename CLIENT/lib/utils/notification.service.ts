import type { NotificationInstance } from "antd/es/notification/interface";

let notificationApi: NotificationInstance | null = null;

export function setNotificationApi(api: NotificationInstance): void {
  notificationApi = api;
}

export function getNotificationApi(): NotificationInstance {
  if (!notificationApi) {
    throw new Error(
      "Notification API not initialized. Make sure App component is mounted."
    );
  }
  return notificationApi;
}
