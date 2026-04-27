"use client";

import { Alert, Button, Card, Skeleton, Space, Switch, Typography } from "antd";
import { useTranslation } from "react-i18next";
import {
  useNotificationMutations,
  useNotificationPreferences,
} from "../hooks/use-notifications";
import { usePushNotifications } from "../hooks/use-push-notifications";
import type { NotificationChannel } from "../types/notification";

const { Text } = Typography;

const CHANNELS: NotificationChannel[] = ["in_app", "email", "push"];

const channelLabelKey: Record<NotificationChannel, string> = {
  in_app: "notifications.channels.inApp",
  email: "notifications.channels.email",
  push: "notifications.channels.push",
};

export function NotificationPreferences() {
  const { t } = useTranslation();
  const { data, isLoading } = useNotificationPreferences();
  const { updatePreferences } = useNotificationMutations();
  const { subscribe, unsubscribe } = usePushNotifications();

  if (isLoading) {
    return (
      <Card title={t("notifications.preferences")}>
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const handleChannelChange = (channel: NotificationChannel, checked: boolean) => {
    updatePreferences.mutate({
      channels: {
        [channel]: checked,
      },
    });

    if (channel === "push") {
      if (checked) {
        subscribe.mutate();
      } else {
        unsubscribe.mutate();
      }
    }
  };

  return (
    <Card title={t("notifications.preferences")}>
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          message={t("notifications.pushHint")}
        />
        {CHANNELS.map((channel) => (
          <Space
            key={channel}
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <Text>{t(channelLabelKey[channel])}</Text>
            <Switch
              checked={data.channels[channel]}
              loading={
                updatePreferences.isPending ||
                subscribe.isPending ||
                unsubscribe.isPending
              }
              onChange={(checked) => handleChannelChange(channel, checked)}
            />
          </Space>
        ))}
        <Button
          onClick={() => subscribe.mutate()}
          loading={subscribe.isPending}
        >
          {t("notifications.enablePush")}
        </Button>
      </Space>
    </Card>
  );
}
