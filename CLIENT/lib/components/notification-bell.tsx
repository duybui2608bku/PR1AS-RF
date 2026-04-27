"use client";

import {
  Badge,
  Button,
  Empty,
  List,
  Popover,
  Space,
  Spin,
  Typography,
} from "antd";
import { BellOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { AppRoute } from "../constants/routes";
import {
  useNotificationMutations,
  useNotifications,
} from "../hooks/use-notifications";
import { useNotificationStore } from "../stores/notification.store";
import type { AppNotification } from "../types/notification";

const { Text } = Typography;

const getNotificationId = (notification: AppNotification): string =>
  notification.id || notification._id || "";

interface NotificationBellProps {
  buttonType?: "text" | "default";
}

export function NotificationBell({
  buttonType = "text",
}: NotificationBellProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const { data, isLoading } = useNotifications({ page: 1, limit: 5 });
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

  const content = (
    <div style={{ width: 360, maxWidth: "80vw" }}>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Text strong>{t("notifications.title")}</Text>
        <Button
          type="link"
          size="small"
          disabled={unreadCount === 0}
          onClick={() => markAllAsRead.mutate()}
        >
          {t("notifications.markAllRead")}
        </Button>
      </Space>

      {isLoading ? (
        <div style={{ padding: 24, textAlign: "center" }}>
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
                background: item.read_at ? undefined : "rgba(22,119,255,0.06)",
                paddingInline: 8,
              }}
            >
              <List.Item.Meta
                title={<Text strong={!item.read_at}>{item.title}</Text>}
                description={
                  <Space orientation="vertical" size={2}>
                    <Text type="secondary">{item.body}</Text>
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
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t("notifications.empty")}
        />
      )}

      <Button
        type="link"
        block
        onClick={() => router.push(AppRoute.NOTIFICATIONS)}
      >
        {t("notifications.viewAll")}
      </Button>
    </div>
  );

  return (
    <Popover content={content} trigger="click" placement="bottomRight">
      <Badge count={unreadCount} size="small" overflowCount={99}>
        <Button
          type={buttonType}
          shape="circle"
          aria-label={t("notifications.title")}
          icon={<BellOutlined />}
        />
      </Badge>
    </Popover>
  );
}
