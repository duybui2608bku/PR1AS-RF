"use client";

import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStandardizedMutation } from "@/lib/hooks/use-standardized-mutation";
import { useSearchParams } from "next/navigation";
import {
  Layout,
  Input,
  Button,
  Typography,
  Empty,
  Spin,
  Popover,
  Modal,
} from "antd";
import {
  SendOutlined,
  DeleteOutlined,
  PlusOutlined,
  PictureOutlined,
  FileOutlined,
  VideoCameraOutlined,
  UnorderedListOutlined,
  ArrowLeftOutlined,
  CommentOutlined,
  CloseOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { message } from "antd";
import { chatApi, type Conversation, type Message } from "@/lib/api/chat.api";
import { ChatErrorCode } from "@/lib/constants/error-codes";
import { useChatSocket } from "@/lib/hooks/use-socket";
import { useAuthStore } from "@/lib/stores/auth.store";
import { AuthGuard } from "@/lib/components/auth-guard";
import { Header } from "@/app/components/header";
import { ConversationList } from "./components/ConversationList";
import { formatTime } from "@/lib/utils";
import { uploadImage, isImageUrl } from "@/lib/utils/upload";
import styles from "./chat.module.scss";

const { Content } = Layout;
const { TextArea } = Input;
const { Text } = Typography;

function ChatContent() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get("userId");
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [messageContent, setMessageContent] = useState("");
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showConversationList, setShowConversationList] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [mobileMenuOpenId, setMobileMenuOpenId] = useState<string | null>(null);
  const replyingToRef = useRef<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { setupListeners, joinConversation, leaveConversation, sendTyping } =
    useChatSocket();

  const { data: conversationsData, isLoading: conversationsLoading } = useQuery(
    {
      queryKey: ["chat-conversations"],
      queryFn: () => chatApi.getConversations({ page: 1, limit: 50 }),
      refetchInterval: 30000,
    }
  );

  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ["chat-messages", selectedConversationId],
    queryFn: () =>
      chatApi.getMessages({
        conversation_id: selectedConversationId || undefined,
        page: 1,
        limit: 100,
      }),
    enabled: !!selectedConversationId,
  });

  const sendMessageMutation = useStandardizedMutation(
    (content: string) => {
      if (!selectedConversationId) {
        throw new Error(ChatErrorCode.CONVERSATION_NOT_FOUND);
      }
      const currentConversation = conversationsData?.conversations.find(
        (c) => c.id === selectedConversationId
      );
      if (!currentConversation) {
        throw new Error(ChatErrorCode.CONVERSATION_NOT_FOUND);
      }
      const receiverId = getOtherParticipant(currentConversation);
      if (!receiverId) {
        throw new Error(ChatErrorCode.CONVERSATION_NOT_FOUND);
      }
      const replyToId = replyingToRef.current?._id || null;
      return chatApi.sendMessage({
        receiver_id: receiverId,
        content,
        type: "text",
        conversation_id: selectedConversationId,
        reply_to_id: replyToId,
      });
    },
    {
      onSuccess: () => {
        setMessageContent("");
        setReplyingTo(null);
        replyingToRef.current = null;
        queryClient.invalidateQueries({
          queryKey: ["chat-messages", selectedConversationId],
        });
        queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      },
    }
  );

  const deleteMessageMutation = useStandardizedMutation(
    (messageId: string) => chatApi.deleteMessage(messageId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["chat-messages", selectedConversationId],
        });
        queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      },
    }
  );

  const markAsReadMutation = useMutation({
    mutationFn: (conversationId: string) =>
      chatApi.markAsRead({
        conversation_id: conversationId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      queryClient.invalidateQueries({
        queryKey: ["chat-messages", selectedConversationId],
      });
    },
  });

  const handleSendMessage = () => {
    if (!messageContent.trim()) return;
    sendMessageMutation.mutate(messageContent.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setReplyingTo(null);
    replyingToRef.current = null;
    markAsReadMutation.mutate(conversationId);
    if (isMobile) {
      setShowConversationList(false);
    }
  };

  const handleBackToConversations = () => {
    setShowConversationList(true);
  };

  const handleDeleteMessage = (messageId: string) => {
    Modal.confirm({
      title: t("chat.deleteMessage"),
      content: t("chat.deleteMessageConfirm"),
      okText: t("common.confirm"),
      cancelText: t("common.cancel"),
      onOk: () => {
        deleteMessageMutation.mutate(messageId);
      },
    });
  };

  const handleReplyMessage = (msg: Message) => {
    setReplyingTo(msg);
    replyingToRef.current = msg;
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    replyingToRef.current = null;
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversationId) return;
    if (!file.type.startsWith("image/")) {
      message.error(t("chat.errors.invalidImageFile"));
      return;
    }

    try {
      setUploadingImage(true);
      const imageUrl = await uploadImage(file);
      const currentConversation = conversationsData?.conversations.find(
        (c) => c.id === selectedConversationId
      );
      if (!currentConversation) {
        throw new Error(ChatErrorCode.CONVERSATION_NOT_FOUND);
      }
      const receiverId = getOtherParticipant(currentConversation);
      if (!receiverId) {
        throw new Error(ChatErrorCode.CONVERSATION_NOT_FOUND);
      }
      await chatApi.sendMessage({
        receiver_id: receiverId,
        content: imageUrl,
        type: "image",
        conversation_id: selectedConversationId,
      });

      queryClient.invalidateQueries({
        queryKey: ["chat-messages", selectedConversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });

      message.success(t("chat.imageSentSuccess"));
    } catch (error) {
      message.error(t("chat.errors.imageUploadFailed"));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleAttachClick = (type: "image" | "file" | "video" | "list") => {
    if (type === "image") {
      fileInputRef.current?.click();
    } else {
      message.info(t("chat.comingSoon"));
    }
  };

  const getOtherParticipant = (conversation: Conversation): string => {
    if (!user?.id || !conversation?.participant_ids) return "";
    const otherId = conversation.participant_ids.find((id) => id !== user.id);
    return otherId || "";
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (selectedConversationId) {
      joinConversation({ conversation_id: selectedConversationId });
      return () => {
        leaveConversation({ conversation_id: selectedConversationId });
      };
    }
  }, [selectedConversationId, joinConversation, leaveConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messagesData?.messages]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setShowConversationList(true);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile && !selectedConversationId) {
      setShowConversationList(true);
    }
  }, [isMobile, selectedConversationId]);

  useEffect(() => {
    if (!targetUserId || !conversationsData?.conversations || !user?.id) {
      return;
    }

    const existingConversation = conversationsData.conversations.find(
      (conv) => {
        const otherParticipant = conv.participant_ids.find(
          (id) => id !== user.id
        );
        return otherParticipant === targetUserId;
      }
    );

    if (existingConversation) {
      setSelectedConversationId(existingConversation.id);
      markAsReadMutation.mutate(existingConversation.id);
      if (isMobile) {
        setShowConversationList(false);
      }
    } else {
      const messagesQuery = chatApi.getMessages({
        receiver_id: targetUserId,
        page: 1,
        limit: 1,
      });

      messagesQuery
        .then((messagesResponse) => {
          if (
            messagesResponse.messages &&
            messagesResponse.messages.length > 0
          ) {
            const firstMessage = messagesResponse.messages[0];
            if (firstMessage.conversation_id) {
              setSelectedConversationId(firstMessage.conversation_id);
              markAsReadMutation.mutate(firstMessage.conversation_id);
              if (isMobile) {
                setShowConversationList(false);
              }
              queryClient.invalidateQueries({
                queryKey: ["chat-conversations"],
              });
            }
          }
        })
        .catch(() => {});
    }
  }, [
    targetUserId,
    conversationsData,
    user?.id,
    isMobile,
    markAsReadMutation,
    queryClient,
  ]);

  setupListeners({
    onNewMessage: (data) => {
      if (data.message.conversation_id === selectedConversationId) {
        queryClient.invalidateQueries({
          queryKey: ["chat-messages", selectedConversationId],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
    onUserTyping: (data) => {
      if (
        data.conversation_id === selectedConversationId &&
        data.user_id !== user?.id
      ) {
        setTypingUsers((prev) => new Set(prev).add(data.user_id));
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(data.user_id);
            return next;
          });
        }, 3000);
      }
    },
    onMessageDeleted: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["chat-messages", selectedConversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    },
  });

  const handleTyping = useCallback(
    (isTyping: boolean) => {
      if (selectedConversationId) {
        sendTyping({
          conversation_id: selectedConversationId,
          is_typing: isTyping,
        });
      }
    },
    [selectedConversationId, sendTyping]
  );

  const selectedConversation = conversationsData?.conversations.find(
    (c) => c.id === selectedConversationId
  );

  const messages = messagesData?.messages || [];

  const getReplyMessage = (
    replyToId: string | null | undefined
  ): Message | null => {
    if (!replyToId) return null;
    return messages.find((m) => m._id === replyToId) || null;
  };

  return (
    <Layout className={styles.chatLayout}>
      <Header />
      <Content className={styles.chatContent}>
        <div className={styles.chatContainer}>
          <div
            className={`${styles.conversationList} ${
              isMobile && !showConversationList ? styles.hidden : ""
            }`}
          >
            <ConversationList
              conversations={conversationsData?.conversations || []}
              selectedConversationId={selectedConversationId}
              isLoading={conversationsLoading}
              currentUserId={user?.id}
              onSelectConversation={handleConversationSelect}
              getOtherParticipant={getOtherParticipant}
            />
          </div>
          {isMobile && showConversationList && selectedConversationId && (
            <div
              className={styles.overlay}
              onClick={() => setShowConversationList(false)}
            />
          )}

          <div
            className={`${styles.chatView} ${
              isMobile && showConversationList ? styles.hidden : ""
            }`}
          >
            {selectedConversationId ? (
              <>
                <div className={styles.chatHeader}>
                  {isMobile && (
                    <Button
                      type="text"
                      icon={<ArrowLeftOutlined />}
                      onClick={handleBackToConversations}
                      className={styles.backButton}
                    />
                  )}
                  <Text strong className={styles.chatHeaderTitle}>
                    {selectedConversation?.other_user?.full_name ||
                      getOtherParticipant(
                        selectedConversation || ({} as Conversation)
                      ) ||
                      t("chat.unknownUser")}
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
                        const isMobileMenuOpen = mobileMenuOpenId === msg._id;
                        return (
                          <div
                            key={msg._id}
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
                                  onClick={() => handleReplyMessage(msg)}
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
                                        handleReplyMessage(msg);
                                        setMobileMenuOpenId(null);
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
                                        handleDeleteMessage(msg._id);
                                        setMobileMenuOpenId(null);
                                      }}
                                    >
                                      {t("chat.delete")}
                                    </Button>
                                  </div>
                                }
                                trigger="click"
                                open={isMobileMenuOpen}
                                onOpenChange={(open) => {
                                  setMobileMenuOpenId(open ? msg._id : null);
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
                                    <Text
                                      strong
                                      className={styles.replyToAuthor}
                                    >
                                      {replyToMessage.sender_id === user?.id
                                        ? t("chat.you")
                                        : selectedConversation?.other_user
                                            ?.full_name ||
                                          t("chat.unknownUser")}
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
                              (msg.type === "text" &&
                                isImageUrl(msg.content)) ? (
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
                            {!isMobile && isOwn && (
                              <div className={styles.messageActions}>
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<CommentOutlined />}
                                  onClick={() => handleReplyMessage(msg)}
                                  className={styles.replyButton}
                                  title={t("chat.reply")}
                                />
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<DeleteOutlined />}
                                  onClick={() => handleDeleteMessage(msg._id)}
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
                                        handleReplyMessage(msg);
                                        setMobileMenuOpenId(null);
                                      }}
                                    >
                                      {t("chat.reply")}
                                    </Button>
                                  </div>
                                }
                                trigger="click"
                                open={isMobileMenuOpen}
                                onOpenChange={(open) => {
                                  setMobileMenuOpenId(open ? msg._id : null);
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
                      })}
                      {typingUsers.size > 0 && (
                        <div className={styles.typingIndicator}>
                          <Text type="secondary">{t("chat.typing")}</Text>
                        </div>
                      )}
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
                              : selectedConversation?.other_user?.full_name ||
                                t("chat.unknownUser")}
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
                      onChange={(e) => {
                        setMessageContent(e.target.value);
                        handleTyping(true);
                      }}
                      onKeyPress={handleKeyPress}
                      onBlur={() => handleTyping(false)}
                      placeholder={t("chat.inputPlaceholder")}
                      autoSize={{ minRows: 1, maxRows: 4 }}
                      className={styles.messageInput}
                    />
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={handleSendMessage}
                      loading={sendMessageMutation.isPending}
                      disabled={!messageContent.trim()}
                      className={styles.sendButton}
                    >
                      {t("common.submit")}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.noSelection}>
                <Empty description={t("chat.selectConversation")} />
              </div>
            )}
          </div>
        </div>
      </Content>
    </Layout>
  );
}

export default function ChatPage() {
  return (
    <AuthGuard>
      <ChatContent />
    </AuthGuard>
  );
}
