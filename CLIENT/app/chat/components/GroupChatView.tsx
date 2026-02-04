"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStandardizedMutation } from "@/lib/hooks/use-standardized-mutation";
import {
  Layout,
  Input,
  Button,
  Typography,
  Empty,
  Spin,
  Popover,
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
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { message } from "antd";
import {
  chatApi,
  type GroupMessage,
} from "@/lib/api/chat.api";
import { ChatErrorCode } from "@/lib/constants/error-codes";
import { useAuthStore } from "@/lib/stores/auth.store";
import { formatTime } from "@/lib/utils";
import { uploadImage, isImageUrl } from "@/lib/utils/upload";
import { ComplaintGroupList } from "./ComplaintGroupList";
import { ChatPagination, ChatRefetchInterval } from "@/lib/constants/chat.constants";
import styles from "../chat.module.scss";

const { Content } = Layout;
const { TextArea } = Input;
const { Text } = Typography;

interface GroupChatViewProps {
  isMobile: boolean;
  showGroupList: boolean;
  onBackToGroupList: () => void;
  onGroupListVisibilityChange: (visible: boolean) => void;
}

export function GroupChatView({
  isMobile,
  showGroupList,
  onBackToGroupList,
  onGroupListVisibilityChange,
}: GroupChatViewProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [messageContent, setMessageContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<GroupMessage | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const replyingToRef = useRef<GroupMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["chat-group-conversations"],
    queryFn: () =>
      chatApi.getGroupConversations({
        page: ChatPagination.PAGE_DEFAULT,
        limit: ChatPagination.LIMIT_CONVERSATIONS,
      }),
    refetchInterval: ChatRefetchInterval.CONVERSATIONS_MS,
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ["chat-group-messages", selectedGroupId],
    queryFn: () =>
      chatApi.getGroupMessages({
        conversation_group_id: selectedGroupId || undefined,
        page: ChatPagination.PAGE_DEFAULT,
        limit: ChatPagination.LIMIT_GROUP_MESSAGES,
      }),
    enabled: !!selectedGroupId,
  });

  const sendGroupMessageMutation = useStandardizedMutation(
    (payload: { content: string; type: "text" | "image" }) => {
      const selectedGroup = groupsData?.conversations.find(
        (g) => g._id === selectedGroupId
      );
      if (!selectedGroupId || !selectedGroup?.booking_id) {
        throw new Error(ChatErrorCode.CONVERSATION_NOT_FOUND);
      }
      return chatApi.sendGroupMessage({
        booking_id: selectedGroup.booking_id,
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

  const markGroupReadMutation = useMutation({
    mutationFn: (conversationGroupId: string) =>
      chatApi.markGroupMessagesRead({ conversation_group_id: conversationGroupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-group-conversations"] });
      queryClient.invalidateQueries({
        queryKey: ["chat-group-messages", selectedGroupId],
      });
    },
  });

  const handleSendMessage = () => {
    if (!messageContent.trim()) return;
    sendGroupMessageMutation.mutate({ content: messageContent.trim(), type: "text" });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectGroup = (conversationGroupId: string) => {
    setSelectedGroupId(conversationGroupId);
    setReplyingTo(null);
    replyingToRef.current = null;
    markGroupReadMutation.mutate(conversationGroupId);
    if (isMobile) {
      onGroupListVisibilityChange(false);
    }
  };

  const handleBackToGroupList = () => {
    onBackToGroupList();
  };

  const handleReplyMessage = (msg: GroupMessage) => {
    setReplyingTo(msg);
    replyingToRef.current = msg;
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    replyingToRef.current = null;
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const selectedGroup = groupsData?.conversations.find(
      (g) => g._id === selectedGroupId
    );
    if (!file || !selectedGroupId || !selectedGroup?.booking_id) return;
    if (!file.type.startsWith("image/")) {
      message.error(t("chat.errors.invalidImageFile"));
      return;
    }
    try {
      setUploadingImage(true);
      const imageUrl = await uploadImage(file);
      await chatApi.sendGroupMessage({
        booking_id: selectedGroup.booking_id,
        content: imageUrl,
        type: "image",
      });
      queryClient.invalidateQueries({
        queryKey: ["chat-group-messages", selectedGroupId],
      });
      queryClient.invalidateQueries({ queryKey: ["chat-group-conversations"] });
      message.success(t("chat.imageSentSuccess"));
    } catch {
      message.error(t("chat.errors.imageUploadFailed"));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAttachClick = (type: "image" | "file" | "video" | "list") => {
    if (type === "image") fileInputRef.current?.click();
    else message.info(t("chat.comingSoon"));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messagesData?.messages]);

  const selectedGroup = groupsData?.conversations.find(
    (g) => g._id === selectedGroupId
  );
  const messages = messagesData?.messages ?? [];
  const groups = groupsData?.conversations ?? [];

  const getReplyMessage = (
    replyToId: string | null | undefined
  ): GroupMessage | null => {
    if (!replyToId) return null;
    return messages.find((m) => m._id === replyToId) ?? null;
  };

  const showChatPanel = !!selectedGroupId;
  const isListHidden = isMobile && !showGroupList;

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
      {isMobile && showGroupList && showChatPanel && (
        <div
          className={styles.overlay}
          onClick={() => onGroupListVisibilityChange(false)}
        />
      )}
      <div
        className={`${styles.chatView} ${
          isMobile && showGroupList ? styles.hidden : ""
        }`}
      >
        {selectedGroupId ? (
          <Fragment>
            <div className={styles.chatHeader}>
              {isMobile && (
                <Button
                  type="text"
                  icon={<ArrowLeftOutlined />}
                  onClick={handleBackToGroupList}
                  className={styles.backButton}
                />
              )}
              <Text strong className={styles.chatHeaderTitle}>
                {selectedGroup?.name ?? t("chat.unknownUser")}
              </Text>
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
                      <div
                        key={msg._id}
                        className={`${styles.messageItem} ${
                          isOwn ? styles.ownMessage : styles.otherMessage
                        }`}
                      >
                        {!isOwn && (
                          <div className={styles.messageActions}>
                            <Button
                              type="text"
                              size="small"
                              icon={<CommentOutlined />}
                              onClick={() => handleReplyMessage(msg)}
                              className={styles.replyButton}
                              title={t("chat.reply")}
                            />
                          </div>
                        )}
                        <div className={styles.messageContent}>
                          {replyToMessage && (
                            <div className={styles.replyToPreview}>
                              <div className={styles.replyToLine} />
                              <div className={styles.replyToContent}>
                                <Text
                                  strong
                                  className={styles.replyToAuthor}
                                >
                                  {replyToMessage.sender_id === user?.id
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
                          )}
                          {msg.type === "image" ||
                          (msg.type === "text" && isImageUrl(msg.content)) ? (
                            <div className={styles.messageImage}>
                              <img
                                src={msg.content}
                                alt="Sent image"
                                className={styles.imagePreview}
                                onClick={() =>
                                  window.open(msg.content, "_blank")
                                }
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
                              {formatTime(msg.created_at, t)}
                            </Text>
                          </div>
                        </div>
                        {isOwn && (
                          <div className={styles.messageActions}>
                            <Button
                              type="text"
                              size="small"
                              icon={<CommentOutlined />}
                              onClick={() => handleReplyMessage(msg)}
                              className={styles.replyButton}
                              title={t("chat.reply")}
                            />
                          </div>
                        )}
                      </div>
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
              {replyingTo && (
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
              )}
              <div className={styles.messageInputWrapper}>
                <Popover
                  content={
                    <div className={styles.attachMenu}>
                      <div
                        className={styles.attachMenuItem}
                        onClick={() => handleAttachClick("image")}
                      >
                        <PictureOutlined />
                        <span>{t("chat.attachImage")}</span>
                      </div>
                      <div
                        className={styles.attachMenuItem}
                        onClick={() => handleAttachClick("file")}
                      >
                        <FileOutlined />
                        <span>{t("chat.attachFile")}</span>
                      </div>
                      <div
                        className={styles.attachMenuItem}
                        onClick={() => handleAttachClick("video")}
                      >
                        <VideoCameraOutlined />
                        <span>{t("chat.attachVideo")}</span>
                      </div>
                      <div
                        className={styles.attachMenuItem}
                        onClick={() => handleAttachClick("list")}
                      >
                        <UnorderedListOutlined />
                        <span>{t("chat.attachList")}</span>
                      </div>
                    </div>
                  }
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
                  onChange={(e) => setMessageContent(e.target.value)}
                  onKeyPress={handleKeyPress}
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
