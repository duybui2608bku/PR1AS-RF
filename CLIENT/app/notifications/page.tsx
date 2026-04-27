"use client";

import { Button, Card, Empty, List, Space, Spin, Typography } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  useNotificationMutations,
  useNotifications,
} from "@/lib/hooks/use-notifications";
import { NotificationPreferences } from "@/lib/components/notification-preferences";
import type { AppNotification } from "@/lib/types/notification";

const { Title, Text } = Typography;

const getNotificationId = (notification: AppNotification): string =>
  notification.id || notification._id || "";

export default function NotificationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data, isLoading, refetch } = useNotifications({
    page: 1,
    limit: 50,
  });
  const { markAsRead, markAllAsRead } = useNotificationMutations();

  const handleOpenNotification = (item: AppNotification) => {
    const notificationId = getNotificationId(item);
    if (!item.read_at && notificationId) {
      markAsRead.mutate(notificationId);
    }
    if (item.link) {
      router.push(item.link);
    }
  };

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 16px" }}>
      <Space
        align="center"
        style={{ width: "100%", justifyContent: "space-between" }}
      >
        <Title level={2}>{t("notifications.title")}</Title>
        <Space>
          <Button onClick={() => refetch()}>{t("common.refresh")}</Button>
          <Button type="primary" onClick={() => markAllAsRead.mutate()}>
            {t("notifications.markAllRead")}
          </Button>
        </Space>
      </Space>

      <Card>
        {isLoading ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <Spin />
          </div>
        ) : data?.data.length ? (
          <List
            dataSource={data.data}
            renderItem={(item) => (
              <List.Item
                key={getNotificationId(item)}
                onClick={() => handleOpenNotification(item)}
                style={{
                  cursor: "pointer",
                  background: item.read_at
                    ? undefined
                    : "rgba(22,119,255,0.06)",
                  paddingInline: 12,
                }}
              >
                <List.Item.Meta
                  title={<Text strong={!item.read_at}>{item.title}</Text>}
                  description={
                    <Space orientation="vertical" size={4}>
                      <Text>{item.body}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(item.created_at).format("DD/MM/YYYY HH:mm")}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description={t("notifications.empty")} />
        )}
      </Card>
      <div style={{ marginTop: 24 }}>
        <NotificationPreferences />
      </div>
    </main>
  );
}
