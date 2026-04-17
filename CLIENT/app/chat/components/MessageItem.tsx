"use client";

import React, { memo } from "react";
import { Button, Typography, Popover, Image } from "antd";
import {
  CommentOutlined,
  DeleteOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import type { Message } from "@/lib/api/chat.api";
import { formatTime } from "@/lib/utils";
import { isImageUrl } from "@/lib/utils/upload";
import styles from "../chat.module.scss";

const { Text } = Typography;

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  isMobile: boolean;
  replyToMessage: Message | null;
  currentUserId?: string;
  otherUserName?: string;
  mobileMenuOpenId: string | null;
  onReply: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onMobileMenuChange: (messageId: string | null) => void;
}

export const MessageItem = memo(function MessageItem({
  message: msg,
  isOwn,
  isMobile,
  replyToMessage,
  currentUserId,
  otherUserName,
  mobileMenuOpenId,
  onReply,
  onDelete,
  onMobileMenuChange,
}: MessageItemProps) {
  const { t } = useTranslation();
  const isMobileMenuOpen = mobileMenuOpenId === msg._id;

  return (
    <div
      className={`${styles.messageItem} ${
        isOwn ? styles.ownMessage : styles.otherMessage
      }`}
    >
      {!isMobile && !isOwn && (
        <div className={styles.messageActions}>
          <Button
            type="text"
            size="small"
            icon={<CommentOutlined />}
            onClick={() => onReply(msg)}
            className={styles.replyButton}
            title={t("chat.reply")}
          />
        </div>
      )}
      {isMobile && isOwn && (
        <Popover
          content={
            <div className={styles.mobileMessageMenu}>
              <Button
                type="text"
                block
                icon={<CommentOutlined />}
                onClick={() => {
                  onReply(msg);
                  onMobileMenuChange(null);
                }}
              >
                {t("chat.reply")}
              </Button>
              <Button
                type="text"
                block
                danger
                icon={<DeleteOutlined />}
                onClick={() => {
                  onDelete(msg._id);
                  onMobileMenuChange(null);
                }}
              >
                {t("chat.delete")}
              </Button>
            </div>
          }
          trigger="click"
          open={isMobileMenuOpen}
          onOpenChange={(open) => {
            onMobileMenuChange(open ? msg._id : null);
          }}
          placement="bottomLeft"
        >
          <Button
            type="text"
            size="small"
            icon={<MoreOutlined />}
            className={styles.mobileMenuButton}
            onClick={(e) => {
              e.stopPropagation();
            }}
          />
        </Popover>
      )}
      <div className={styles.messageContent}>
        {replyToMessage && (
          <div className={styles.replyToPreview}>
            <div className={styles.replyToLine} />
            <div className={styles.replyToContent}>
              <Text strong className={styles.replyToAuthor}>
                {replyToMessage.sender_id === currentUserId
                  ? t("chat.you")
                  : otherUserName || t("chat.unknownUser")}
              </Text>
              <Text
                ellipsis
                className={styles.replyToMessage}
                title={replyToMessage.content}
              >
                {replyToMessage.type === "image"
                  ? t("chat.sentImage")
                  : replyToMessage.content}
              </Text>
            </div>
          </div>
        )}
        {msg.type === "image" ||
        (msg.type === "text" && isImageUrl(msg.content)) ? (
          <div className={styles.messageImage}>
            <Image
              src={msg.content}
              alt="Sent image"
              className={styles.imagePreview}
              preview={{
                src: msg.content,
              }}
            />
          </div>
        ) : (
          <Text>{msg.content}</Text>
        )}
        <div className={styles.messageMeta}>
          <Text type="secondary" className={styles.messageTime}>
            {formatTime(msg.created_at, t)}
          </Text>
        </div>
      </div>
      {!isMobile && isOwn && (
        <div className={styles.messageActions}>
          <Button
            type="text"
            size="small"
            icon={<CommentOutlined />}
            onClick={() => onReply(msg)}
            className={styles.replyButton}
            title={t("chat.reply")}
          />
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => onDelete(msg._id)}
            className={styles.deleteButton}
            title={t("chat.delete")}
          />
        </div>
      )}
      {isMobile && !isOwn && (
        <Popover
          content={
            <div className={styles.mobileMessageMenu}>
              <Button
                type="text"
                block
                icon={<CommentOutlined />}
                onClick={() => {
                  onReply(msg);
                  onMobileMenuChange(null);
                }}
              >
                {t("chat.reply")}
              </Button>
            </div>
          }
          trigger="click"
          open={isMobileMenuOpen}
          onOpenChange={(open) => {
            onMobileMenuChange(open ? msg._id : null);
          }}
          placement="bottomRight"
        >
          <Button
            type="text"
            size="small"
            icon={<MoreOutlined />}
            className={styles.mobileMenuButton}
            onClick={(e) => {
              e.stopPropagation();
            }}
          />
        </Popover>
      )}
    </div>
  );
});
