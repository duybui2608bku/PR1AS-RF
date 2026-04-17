"use client";

import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStandardizedMutation } from "@/lib/hooks/use-standardized-mutation";
import { useSearchParams } from "next/navigation";
import {
  Button,
  Typography,
  Empty,
  Spin,
  Modal,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { message } from "antd";
import { chatApi, type Conversation, type Message } from "@/lib/api/chat.api";
import { ChatErrorCode } from "@/lib/constants/error-codes";
import { useChatSocket } from "@/lib/hooks/use-socket";
import { useAuthStore } from "@/lib/stores/auth.store";
import { AuthGuard } from "@/lib/components/auth-guard";
import { ConversationList } from "./components/ConversationList";
import { MessageItem } from "./components/MessageItem";
import { ChatInput } from "./components/ChatInput";
import { uploadImage } from "@/lib/utils/upload";
import styles from "./chat.module.scss";
import { useMobile } from "@/lib/hooks/use-mobile";

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
  const isMobile = useMobile();
  const [showConversationList, setShowConversationList] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [mobileMenuOpenId, setMobileMenuOpenId] = useState<string | null>(null);
  const replyingToRef = useRef<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastMarkedAsReadConversationIdRef = useRef<string | null>(null);
  const hasManualConversationSelectionRef = useRef(false);

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

  // Query to find conversation for a target user when no existing conversation is found
  const needsTargetLookup =
    !!targetUserId &&
    !!user?.id &&
    !!conversationsData?.conversations &&
    !conversationsData.conversations.find(
      (conv) =>
        conv.participant_ids.find((id) => id !== user.id) === targetUserId
    );

  const { data: targetUserMessages } = useQuery({
    queryKey: ["chat-target-lookup", targetUserId],
    queryFn: () =>
      chatApi.getMessages({
        receiver_id: targetUserId!,
        page: 1,
        limit: 1,
      }),
    enabled: needsTargetLookup,
  });

  const sendMessageMutation = useStandardizedMutation(
    (content: string) => {
      const currentConversation = selectedConversationId
        ? conversationsData?.conversations.find(
            (c) => c.id === selectedConversationId
          )
        : null;
      const receiverId = currentConversation
        ? getOtherParticipant(currentConversation)
        : targetUserId;
      if (!receiverId || (receiverId === user?.id)) {
        throw new Error(ChatErrorCode.CONVERSATION_NOT_FOUND);
      }
      const replyToId = replyingToRef.current?._id || null;
      return chatApi.sendMessage({
        receiver_id: receiverId,
        content,
        type: "text",
        ...(selectedConversationId
          ? { conversation_id: selectedConversationId }
          : {}),
        reply_to_id: replyToId,
      });
    },
    {
      onSuccess: (result) => {
        setMessageContent("");
        setReplyingTo(null);
        replyingToRef.current = null;
        if (result.conversation && !selectedConversationId) {
          setSelectedConversationId(result.conversation._id);
        }
        const conversationId =
          result.conversation?._id ?? selectedConversationId;
        if (conversationId) {
          queryClient.invalidateQueries({
            queryKey: ["chat-messages", conversationId],
          });
        }
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

  const markAsReadMutation = useStandardizedMutation(
    (conversationId: string) =>
      chatApi.markAsRead({
        conversation_id: conversationId,
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
        queryClient.invalidateQueries({
          queryKey: ["chat-messages", selectedConversationId],
        });
      },
      skipErrorNotification: true,
    }
  );

  const handleSendMessage = () => {
    if (!messageContent.trim()) return;
    sendMessageMutation.mutate(messageContent.trim());
  };


  const handleConversationSelect = (conversationId: string) => {
    hasManualConversationSelectionRef.current = true;
    setSelectedConversationId(conversationId);
    setReplyingTo(null);
    replyingToRef.current = null;
    lastMarkedAsReadConversationIdRef.current = conversationId;
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

  const sendImageMutation = useStandardizedMutation(
    (payload: { receiverId: string; imageUrl: string }) => {
      return chatApi.sendMessage({
        receiver_id: payload.receiverId,
        content: payload.imageUrl,
        type: "image",
        ...(selectedConversationId
          ? { conversation_id: selectedConversationId }
          : {}),
      });
    },
    {
      onSuccess: (result) => {
        if (result.conversation && !selectedConversationId) {
          setSelectedConversationId(result.conversation._id);
        }
        const conversationId =
          result.conversation?._id ?? selectedConversationId;
        if (conversationId) {
          queryClient.invalidateQueries({
            queryKey: ["chat-messages", conversationId],
          });
        }
        queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
        message.success(t("chat.imageSentSuccess"));
      },
    }
  );

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const showPanel = selectedConversationId || (targetUserId && user?.id);
    if (!file || !showPanel) return;
    if (!file.type.startsWith("image/")) {
      message.error(t("chat.errors.invalidImageFile"));
      return;
    }

    const currentConversation = selectedConversationId
      ? conversationsData?.conversations.find(
          (c) => c.id === selectedConversationId
        )
      : null;
    const receiverId = currentConversation
      ? getOtherParticipant(currentConversation)
      : targetUserId;
    if (!receiverId || receiverId === user?.id) {
      message.error(t("chat.errors.imageUploadFailed"));
      return;
    }

    try {
      setUploadingImage(true);
      const imageUrl = await uploadImage(file);
      sendImageMutation.mutate({ receiverId, imageUrl });
    } catch (error) {
      message.error(t("chat.errors.imageUploadFailed"));
    } finally {
      setUploadingImage(false);
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
    if (!isMobile) {
      setShowConversationList(true);
    }
  }, [isMobile]);

  useEffect(() => {
    if (isMobile && !selectedConversationId && !targetUserId) {
      setShowConversationList(true);
    }
  }, [isMobile, selectedConversationId, targetUserId]);

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
      if (
        hasManualConversationSelectionRef.current &&
        selectedConversationId &&
        selectedConversationId !== existingConversation.id
      ) {
        return;
      }

      setSelectedConversationId(existingConversation.id);
      if (lastMarkedAsReadConversationIdRef.current !== existingConversation.id) {
        lastMarkedAsReadConversationIdRef.current = existingConversation.id;
        markAsReadMutation.mutate(existingConversation.id);
      }
      if (isMobile) {
        setShowConversationList(false);
      }
    } else if (targetUserMessages?.messages?.length) {
      const firstMessage = targetUserMessages.messages[0];
      if (firstMessage.conversation_id) {
        setSelectedConversationId(firstMessage.conversation_id);
        if (
          lastMarkedAsReadConversationIdRef.current !==
          firstMessage.conversation_id
        ) {
          lastMarkedAsReadConversationIdRef.current = firstMessage.conversation_id;
          markAsReadMutation.mutate(firstMessage.conversation_id);
        }
        if (isMobile) {
          setShowConversationList(false);
        }
        queryClient.invalidateQueries({
          queryKey: ["chat-conversations"],
        });
      }
    } else if (needsTargetLookup && isMobile) {
      setShowConversationList(false);
    }
  }, [
    targetUserId,
    conversationsData,
    user?.id,
    isMobile,
    selectedConversationId,
    markAsReadMutation,
    queryClient,
    targetUserMessages,
    needsTargetLookup,
  ]);

  useEffect(() => {
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
      onMessageDeleted: () => {
        queryClient.invalidateQueries({
          queryKey: ["chat-messages", selectedConversationId],
        });
        queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      },
    });
  }, [queryClient, selectedConversationId, setupListeners, user?.id]);

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

  const showChatPanel =
    !!selectedConversationId || !!(targetUserId && user?.id);
  const messages = messagesData?.messages || [];

  const getReplyMessage = (
    replyToId: string | null | undefined
  ): Message | null => {
    if (!replyToId) return null;
    return messages.find((m) => m._id === replyToId) || null;
  };

  return (
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
          {isMobile && showConversationList && showChatPanel && (
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
                  {selectedConversationId && messagesLoading ? (
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
                          <MessageItem
                            key={msg._id}
                            message={msg}
                            isOwn={isOwn}
                            isMobile={isMobile}
                            replyToMessage={replyToMessage}
                            currentUserId={user?.id}
                            otherUserName={selectedConversation?.other_user?.full_name}
                            mobileMenuOpenId={mobileMenuOpenId}
                            onReply={handleReplyMessage}
                            onDelete={handleDeleteMessage}
                            onMobileMenuChange={setMobileMenuOpenId}
                          />
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
                <ChatInput
                  messageContent={messageContent}
                  onMessageChange={setMessageContent}
                  onSend={handleSendMessage}
                  onImageSelect={handleImageSelect}
                  onTyping={handleTyping}
                  isSending={sendMessageMutation.isPending}
                  uploadingImage={uploadingImage}
                  replyingTo={replyingTo}
                  currentUserId={user?.id}
                  otherUserName={selectedConversation?.other_user?.full_name}
                  onCancelReply={handleCancelReply}
                />
              </>
            ) : (
              <div className={styles.noSelection}>
                <Empty description={t("chat.selectConversation")} />
              </div>
            )}
          </div>
        </div>
  );
}

export default function ChatPage() {
  return (
    <AuthGuard>
      <ChatContent />
    </AuthGuard>
  );
}