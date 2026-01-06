"use client";

import { List, Avatar, Badge, Space, Typography, Empty, Spin } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { Conversation } from "@/lib/api/chat.api";
import { formatTime } from "@/lib/utils";
import styles from "../chat.module.scss";
import { Fragment } from "react";

const { Text } = Typography;

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  isLoading: boolean;
  currentUserId: string | undefined;
  onSelectConversation: (conversationId: string) => void;
  getOtherParticipant: (conversation: Conversation) => string;
}

export function ConversationList({
  conversations,
  selectedConversationId,
  isLoading,
  currentUserId,
  onSelectConversation,
  getOtherParticipant,
}: ConversationListProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <Empty
        description={t("chat.noConversations")}
        className={styles.emptyState}
      />
    );
  }

  return (
    <Fragment>
      <div className={styles.conversationListHeader}>
        <Text strong className={styles.headerTitle}>
          {t("chat.conversations")}
        </Text>
      </div>
      <List
        className={styles.conversationListItems}
        dataSource={conversations}
        renderItem={(conversation) => {
          const otherId = getOtherParticipant(conversation);
          const isSelected = conversation.id === selectedConversationId;
          return (
            <List.Item
              className={`${styles.conversationItem} ${
                isSelected ? styles.selected : ""
              }`}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <List.Item.Meta
                avatar={
                  <Badge
                    count={conversation.unread_count || 0}
                    offset={[-5, 5]}
                  >
                    <Avatar icon={<UserOutlined />} />
                  </Badge>
                }
                title={
                  <Space>
                    <Text strong>
                      {conversation.other_user?.full_name ||
                        otherId ||
                        t("chat.unknownUser")}
                    </Text>
                    {conversation.last_message && (
                      <Text type="secondary" className={styles.lastMessageTime}>
                        {formatTime(conversation.last_message.created_at, t)}
                      </Text>
                    )}
                  </Space>
                }
                description={
                  <Text ellipsis className={styles.lastMessageText}>
                    {conversation.last_message
                      ? conversation.last_message.type === "image"
                        ? t("chat.sentImage")
                        : conversation.last_message.content
                      : t("chat.noMessages")}
                  </Text>
                }
              />
            </List.Item>
          );
        }}
      />
    </Fragment>
  );
}
