"use client";

import { useState, useEffect, useRef, useCallback, useMemo, Fragment, memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStandardizedMutation } from "@/lib/hooks/use-standardized-mutation";
import {
  Input,
  Button,
  Typography,
  Empty,
  Spin,
  Popover,
  Avatar,
  Image,
} from "antd";
import {
  SendOutlined,
  PlusOutlined,
  PictureOutlined,
  FileOutlined,
  VideoCameraOutlined,
  UnorderedListOutlined,
  ArrowLeftOutlined,
  CommentOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "next/navigation";
import { message } from "antd";
import { chatApi, type GroupMessage } from "@/lib/api/chat.api";
import { ChatErrorCode } from "@/lib/constants/error-codes";
import { useAuthStore } from "@/lib/stores/auth.store";
import { formatTime } from "@/lib/utils";
import { uploadImage, isImageUrl } from "@/lib/utils/upload";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import { ComplaintGroupList } from "./ComplaintGroupList";
import { ChatPagination, ChatRefetchInterval } from "@/lib/constants/chat.constants";
import { BookingInfoPopover } from "./BookingInfoPopover";
import styles from "../../chat.module.scss";


const { TextArea } = Input;
const { Text } = Typography;

interface GroupChatViewProps {
  isMobile: boolean;
  showGroupList: boolean;
  onBackToGroupList: () => void;
  onGroupListVisibilityChange: (visible: boolean) => void;
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

interface GroupMessageItemProps {
  msg: GroupMessage;
  isOwn: boolean;
  replyToMessage: GroupMessage | null;
  currentUserId?: string;
  onReply: (msg: GroupMessage) => void;
  t: (key: string) => string;
}

const GroupMessageItem = memo(function GroupMessageItem({
  msg,
  isOwn,
  replyToMessage,
  currentUserId,
  onReply,
  t,
}: GroupMessageItemProps) {
  const handleReply = useCallback(() => onReply(msg), [onReply, msg]);

  return (
    <div
      className={`${styles.messageItem} ${
        isOwn ? styles.ownMessage : styles.otherMessage
      }`}
    >
      <div className={styles.messageAvatarWrapper}>
        <Avatar
          size={32}
          icon={<UserOutlined />}
        />
      </div>
      <div className={styles.messageContent}>
        {replyToMessage ? (
          <div className={styles.replyToPreview}>
            <div className={styles.replyToLine} />
            <div className={styles.replyToContent}>
              <Text
                strong
                className={styles.replyToAuthor}
              >
                {replyToMessage.sender_id === currentUserId
                  ? t("chat.you")
                  : t("chat.unknownUser")}
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
        ) : null}
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
          <Text
            type="secondary"
            className={styles.messageTime}
          >
            {formatTime(msg.created_at, t as Parameters<typeof formatTime>[1])}
          </Text>
        </div>
      </div>
      <div className={styles.messageActions}>
        <Button
          type="text"
          size="small"
          icon={<CommentOutlined />}
          onClick={handleReply}
          className={styles.replyButton}
          title={t("chat.reply")}
        />
      </div>
    </div>
  );
});

export function GroupChatView({
  isMobile,
  showGroupList,
  onBackToGroupList,
  onGroupListVisibilityChange,
}: GroupChatViewProps) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const { handleError } = useErrorHandler();
  const queryClient = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<GroupMessage | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const initialGroupId = searchParams.get("group");
  const initialGroupSelectedRef = useRef(false);
  const replyingToRef = useRef<GroupMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: groupsData,
    isLoading: groupsLoading,
    error: groupsError,
  } = useQuery({
    queryKey: ["chat-group-conversations"],
    queryFn: () =>
      chatApi.getGroupConversations({
        page: ChatPagination.PAGE_DEFAULT,
        limit: ChatPagination.LIMIT_CONVERSATIONS,
      }),
    refetchInterval: ChatRefetchInterval.CONVERSATIONS_MS,
  });

  const {
    data: messagesData,
    isLoading: messagesLoading,
    error: messagesError,
  } = useQuery({
    queryKey: ["chat-group-messages", selectedGroupId],
    queryFn: () =>
      chatApi.getGroupMessages({
        conversation_group_id: selectedGroupId || undefined,
        page: ChatPagination.PAGE_DEFAULT,
        limit: ChatPagination.LIMIT_GROUP_MESSAGES,
      }),
    enabled: !!selectedGroupId,
  });

  const selectedGroup = useMemo(
    () => groupsData?.conversations.find((g) => g._id === selectedGroupId),
    [groupsData?.conversations, selectedGroupId]
  );

  const sendGroupMessageMutation = useStandardizedMutation(
    (payload: { content: string; type: "text" | "image" }) => {
      const group = groupsData?.conversations.find(
        (g) => g._id === selectedGroupId
      );
      if (!selectedGroupId || !group?.booking_id) {
        throw new Error(ChatErrorCode.CONVERSATION_NOT_FOUND);
      }
      return chatApi.sendGroupMessage({
        booking_id: group.booking_id,
        content: payload.content,
        type: payload.type,
        reply_to_id: replyingToRef.current?._id ?? null,
      });
    },
    {
      onSuccess: () => {
        setMessageContent("");
        setReplyingTo(null);
        replyingToRef.current = null;
        queryClient.invalidateQueries({
          queryKey: ["chat-group-messages", selectedGroupId],
        });
        queryClient.invalidateQueries({
          queryKey: ["chat-group-conversations"],
        });
      },
    }
  );

  const markGroupReadMutation = useStandardizedMutation(
    (conversationGroupId: string) =>
      chatApi.markGroupMessagesRead({ conversation_group_id: conversationGroupId }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["chat-group-conversations"] });
        queryClient.invalidateQueries({
          queryKey: ["chat-group-messages", selectedGroupId],
        });
      },
      skipErrorNotification: true,
    }
  );

  const handleSendMessage = useCallback(() => {
    if (!messageContent.trim()) return;
    sendGroupMessageMutation.mutate({ content: messageContent.trim(), type: "text" });
  }, [messageContent, sendGroupMessageMutation]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleSelectGroup = useCallback((conversationGroupId: string) => {
    setSelectedGroupId(conversationGroupId);
    setReplyingTo(null);
    replyingToRef.current = null;
    markGroupReadMutation.mutate(conversationGroupId);
    if (isMobile) {
      onGroupListVisibilityChange(false);
    }
  }, [isMobile, markGroupReadMutation, onGroupListVisibilityChange]);

  useEffect(() => {
    if (!initialGroupId || initialGroupSelectedRef.current) {
      return;
    }

    const groupExists = groupsData?.conversations.some(
      (group) => group._id === initialGroupId
    );

    if (!groupExists && groupsData) {
      return;
    }

    initialGroupSelectedRef.current = true;
    setSelectedGroupId(initialGroupId);
    markGroupReadMutation.mutate(initialGroupId);
    if (isMobile) {
      onGroupListVisibilityChange(false);
    }
  }, [
    groupsData,
    initialGroupId,
    isMobile,
    markGroupReadMutation,
    onGroupListVisibilityChange,
  ]);

  const handleReplyMessage = useCallback((msg: GroupMessage) => {
    setReplyingTo(msg);
    replyingToRef.current = msg;
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
    replyingToRef.current = null;
  }, []);

  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const group = groupsData?.conversations.find(
      (g) => g._id === selectedGroupId
    );
    if (!file || !selectedGroupId || !group?.booking_id) return;
    if (!file.type.startsWith("image/")) {
      message.error(t("chat.errors.invalidImageFile"));
      return;
    }
    try {
      setUploadingImage(true);
      const imageUrl = await uploadImage(file);
      sendGroupMessageMutation.mutate({ content: imageUrl, type: "image" });
      message.success(t("chat.imageSentSuccess"));
    } catch {
      message.error(t("chat.errors.imageUploadFailed"));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [groupsData?.conversations, selectedGroupId, sendGroupMessageMutation, t]);

  const handleAttachClick = useCallback((type: "image" | "file" | "video" | "list") => {
    if (type === "image") fileInputRef.current?.click();
    else message.info(t("chat.comingSoon"));
  }, [t]);

  const handleTextAreaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageContent(e.target.value);
  }, []);

  const handleOverlayClick = useCallback(() => {
    onGroupListVisibilityChange(false);
  }, [onGroupListVisibilityChange]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData?.messages]);

  useEffect(() => {
    if (groupsError) {
      handleError(groupsError);
    }
  }, [groupsError, handleError]);

  useEffect(() => {
    if (messagesError) {
      handleError(messagesError);
    }
  }, [messagesError, handleError]);

  const messages = useMemo(() => messagesData?.messages ?? [], [messagesData?.messages]);
  const groups = useMemo(() => groupsData?.conversations ?? [], [groupsData?.conversations]);

  const getReplyMessage = useCallback((
    replyToId: string | null | undefined
  ): GroupMessage | null => {
    if (!replyToId) return null;
    return messages.find((m) => m._id === replyToId) ?? null;
  }, [messages]);

  const showChatPanel = !!selectedGroupId;
  const isListHidden = isMobile && !showGroupList;

  const attachContent = useMemo(
    () => <AttachActions onAttachClick={handleAttachClick} />,
    [handleAttachClick]
  );

  return (
    <Fragment>
      <div
        className={`${styles.conversationList} ${isListHidden ? styles.hidden : ""}`}
      >
        <ComplaintGroupList
          groups={groups}
          selectedGroupId={selectedGroupId}
          isLoading={groupsLoading}
          onSelectGroup={handleSelectGroup}
        />
      </div>
      {isMobile && showGroupList && showChatPanel ? (
        <div
          className={styles.overlay}
          onClick={handleOverlayClick}
        />
      ) : null}
      <div
        className={`${styles.chatView} ${
          isMobile && showGroupList ? styles.hidden : ""
        }`}
      >
        {selectedGroupId ? (
          <Fragment>
            <div className={styles.chatHeader}>
              {isMobile ? (
                <Button
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  onClick={onBackToGroupList}
                  className={styles.backButton}
                />
              ) : null}
              <Text strong className={styles.chatHeaderTitle}>
                {selectedGroup?.name ?? t("chat.unknownUser")}
              </Text>
              {selectedGroup?.booking_id ? (
                <BookingInfoPopover
                  bookingId={selectedGroup.booking_id}
                  isMobile={isMobile}
                >
                  <Button
                    type="text"
                    icon={<InfoCircleOutlined />}
                    className={styles.bookingInfoButton}
                  />
                </BookingInfoPopover>
              ) : null}
            </div>
            <div
              className={styles.messagesContainer}
              ref={messagesContainerRef}
            >
              {messagesLoading ? (
                <div className={styles.loadingContainer}>
                  <Spin size="large" />
                </div>
              ) : messages.length === 0 ? (
                <Empty
                  description={t("chat.noMessages")}
                  className={styles.emptyState}
                />
              ) : (
                <Fragment>
                  {messages.map((msg) => {
                    const isOwn = msg.sender_id === user?.id;
                    const replyToMessage = getReplyMessage(msg.reply_to_id);
                    return (
                      <GroupMessageItem
                        key={msg._id}
                        msg={msg}
                        isOwn={isOwn}
                        replyToMessage={replyToMessage}
                        currentUserId={user?.id}
                        onReply={handleReplyMessage}
                        t={t}
                      />
                    );
                  })}
                  <div ref={messagesEndRef} />
                </Fragment>
              )}
            </div>
            <div className={styles.messageInputContainer}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className={styles.hiddenInput}
                onChange={handleImageSelect}
              />
              {replyingTo ? (
                <div className={styles.replyPreview}>
                  <div className={styles.replyPreviewContent}>
                    <CommentOutlined className={styles.replyIcon} />
                    <div className={styles.replyPreviewText}>
                      <Text strong className={styles.replyPreviewAuthor}>
                        {replyingTo.sender_id === user?.id
                          ? t("chat.you")
                          : t("chat.unknownUser")}
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
                    onClick={handleCancelReply}
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
                  placeholder={t("chat.inputPlaceholder")}
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  className={styles.messageInput}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  loading={sendGroupMessageMutation.isPending}
                  disabled={!messageContent.trim()}
                  className={styles.sendButton}
                >
                  {t("common.submit")}
                </Button>
              </div>
            </div>
          </Fragment>
        ) : (
          <div className={styles.noSelection}>
            <Empty description={t("chat.selectConversation")} />
          </div>
        )}
      </div>
    </Fragment>
  );
}
