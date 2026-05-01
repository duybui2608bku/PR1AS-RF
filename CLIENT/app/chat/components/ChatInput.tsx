"use client";

import React, { memo, useCallback, useRef } from "react";
import { Input, Button, Typography, Popover } from "antd";
import {
  SendOutlined,
  PlusOutlined,
  PictureOutlined,
  FileOutlined,
  VideoCameraOutlined,
  UnorderedListOutlined,
  CommentOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { message as antMessage } from "antd";
import type { Message } from "@/lib/api/chat.api";
import styles from "../chat.module.scss";

const { TextArea } = Input;
const { Text } = Typography;

interface ChatInputProps {
  messageContent: string;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTyping: (isTyping: boolean) => void;
  isSending: boolean;
  uploadingImage: boolean;
  replyingTo: Message | null;
  currentUserId?: string;
  otherUserName?: string;
  onCancelReply: () => void;
}

interface AttachActionsProps {
  onAttachClick: (type: "image" | "file" | "video" | "list") => void;
}

const AttachActions = memo(function AttachActions({ onAttachClick }: AttachActionsProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.attachMenu}>
      <Button
        type="text"
        icon={<PictureOutlined />}
        className={styles.attachMenuItem}
        onClick={() => onAttachClick("image")}
      >
        {t("chat.attachImage")}
      </Button>
      <Button
        type="text"
        icon={<FileOutlined />}
        className={styles.attachMenuItem}
        onClick={() => onAttachClick("file")}
      >
        {t("chat.attachFile")}
      </Button>
      <Button
        type="text"
        icon={<VideoCameraOutlined />}
        className={styles.attachMenuItem}
        onClick={() => onAttachClick("video")}
      >
        {t("chat.attachVideo")}
      </Button>
      <Button
        type="text"
        icon={<UnorderedListOutlined />}
        className={styles.attachMenuItem}
        onClick={() => onAttachClick("list")}
      >
        {t("chat.attachList")}
      </Button>
    </div>
  );
});

export const ChatInput = memo(function ChatInput({
  messageContent,
  onMessageChange,
  onSend,
  onImageSelect,
  onTyping,
  isSending,
  uploadingImage,
  replyingTo,
  currentUserId,
  otherUserName,
  onCancelReply,
}: ChatInputProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }, [onSend]);

  const handleAttachClick = useCallback((type: "image" | "file" | "video" | "list") => {
    if (type === "image") {
      fileInputRef.current?.click();
    } else {
      antMessage.info(t("chat.comingSoon"));
    }
  }, [t]);

  const handleTextAreaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onMessageChange(e.target.value);
    onTyping(true);
  }, [onMessageChange, onTyping]);

  const handleBlur = useCallback(() => onTyping(false), [onTyping]);

  const attachContent = <AttachActions onAttachClick={handleAttachClick} />;

  return (
    <div className={styles.messageInputContainer}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className={styles.hiddenInput}
        onChange={onImageSelect}
      />
      {replyingTo ? (
        <div className={styles.replyPreview}>
          <div className={styles.replyPreviewContent}>
            <CommentOutlined className={styles.replyIcon} />
            <div className={styles.replyPreviewText}>
              <Text strong className={styles.replyPreviewAuthor}>
                {replyingTo.sender_id === currentUserId
                  ? t("chat.you")
                  : otherUserName || t("chat.unknownUser")}
              </Text>
              <Text
                ellipsis
                className={styles.replyPreviewMessage}
                title={replyingTo.content}
              >
                {replyingTo.type === "image"
                  ? t("chat.sentImage")
                  : replyingTo.content}
              </Text>
            </div>
          </div>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={onCancelReply}
            className={styles.replyCancelButton}
          />
        </div>
      ) : null}
      <div className={styles.messageInputWrapper}>
        <Popover
          content={attachContent}
          trigger="click"
          placement="topLeft"
        >
          <Button
            type="text"
            icon={<PlusOutlined />}
            className={styles.attachButton}
            loading={uploadingImage}
          />
        </Popover>
        <TextArea
          value={messageContent}
          onChange={handleTextAreaChange}
          onKeyDown={handleKeyPress}
          onBlur={handleBlur}
          placeholder={t("chat.inputPlaceholder")}
          autoSize={{ minRows: 1, maxRows: 4 }}
          className={styles.messageInput}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={onSend}
          loading={isSending}
          disabled={!messageContent.trim()}
          className={styles.sendButton}
        >
          {t("common.submit")}
        </Button>
      </div>
    </div>
  );
});
