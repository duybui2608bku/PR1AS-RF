"use client";

import { List, Badge, Space, Typography } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { ApiGroupConversation } from "@/lib/api/chat.api";
import { formatTime } from "@/lib/utils";
import { QueryState } from "@/lib/components/query-state";
import { LoadingSize } from "@/lib/constants/ui.constants";
import styles from "../chat.module.scss";
import { Fragment, memo, useCallback, useMemo } from "react";

const { Text } = Typography;

interface ComplaintGroupListProps {
  groups: ApiGroupConversation[];
  selectedGroupId: string | null;
  isLoading: boolean;
  onSelectGroup: (conversationGroupId: string) => void;
}

function ComplaintGroupListComponent({
  groups,
  selectedGroupId,
  isLoading,
  onSelectGroup,
}: ComplaintGroupListProps) {
  const { t } = useTranslation();

  const handleSelectGroup = useCallback(
    (conversationGroupId: string) => {
      onSelectGroup(conversationGroupId);
    },
    [onSelectGroup]
  );

  const renderGroupItem = useCallback(
    (group: ApiGroupConversation) => {
      const isSelected = group._id === selectedGroupId;
      const lastMessage = group.last_message_data;
      return (
        <List.Item
          className={`${styles.conversationItem} ${
            isSelected ? styles.selected : ""
          }`}
          onClick={() => handleSelectGroup(group._id)}
        >
          <List.Item.Meta
            avatar={
              <Badge count={group.unread_count ?? 0} offset={[-5, 5]}>
                <TeamOutlined
                  style={{ fontSize: 24, color: "var(--ant-color-text-secondary)" }}
                />
              </Badge>
            }
            title={
              <Space>
                <Text strong ellipsis>
                  {group.name}
                </Text>
                {lastMessage && (
                  <Text type="secondary" className={styles.lastMessageTime}>
                    {formatTime(lastMessage.created_at, t)}
                  </Text>
                )}
              </Space>
            }
            description={
              <Text ellipsis className={styles.lastMessageText}>
                {lastMessage
                  ? lastMessage.type === "image"
                    ? t("chat.sentImage")
                    : lastMessage.content
                  : t("chat.noMessages")}
              </Text>
            }
          />
        </List.Item>
      );
    },
    [selectedGroupId, handleSelectGroup, t]
  );

  const isEmpty = useMemo(() => groups.length === 0, [groups.length]);

  return (
    <QueryState
      isLoading={isLoading}
      isError={false}
      showEmpty={isEmpty}
      emptyMessage={t("chat.noComplaintGroups")}
      loadingSize={LoadingSize.LARGE}
      className={styles.loadingContainer}
    >
      <Fragment>
        <div className={styles.conversationListHeader}>
          <Text strong className={styles.headerTitle}>
            {t("chat.complaintGroups")}
          </Text>
        </div>
        <List
          className={styles.conversationListItems}
          dataSource={groups}
          renderItem={renderGroupItem}
        />
      </Fragment>
    </QueryState>
  );
}

export const ComplaintGroupList = memo(ComplaintGroupListComponent);
