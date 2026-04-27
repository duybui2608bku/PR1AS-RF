"use client";

import { useEffect } from "react";
import { chatSocket } from "../socket";
import type {
  NewMessageData,
  UserTypingData,
  ConversationJoinedData,
  ConversationLeftData,
  ReadConfirmedData,
  SocketErrorData,
  RealtimeNotificationPayload,
  RealtimeUnreadCountPayload,
} from "../socket";

export const useSocket = () => {
  useEffect(() => {
    const socket = chatSocket;
    return () => {
      socket.disconnect();
    };
  }, []);

  return chatSocket;
};

export const useChatSocket = () => {
  const socket = useSocket();

  const setupListeners = (callbacks: {
    onNewMessage?: (data: NewMessageData) => void;
    onUserTyping?: (data: UserTypingData) => void;
    onConversationJoined?: (data: ConversationJoinedData) => void;
    onConversationLeft?: (data: ConversationLeftData) => void;
    onReadConfirmed?: (data: ReadConfirmedData) => void;
    onMessageRead?: (data: NewMessageData) => void;
    onMessageDeleted?: (data: { message_id: string }) => void;
    onError?: (data: SocketErrorData) => void;
    onConnected?: (data: { user_id: string }) => void;
    onNotificationNew?: (data: RealtimeNotificationPayload) => void;
    onNotificationUnreadCount?: (data: RealtimeUnreadCountPayload) => void;
  }) => {
    if (callbacks.onNewMessage) {
      socket.onNewMessage(callbacks.onNewMessage);
    }
    if (callbacks.onUserTyping) {
      socket.onUserTyping(callbacks.onUserTyping);
    }
    if (callbacks.onConversationJoined) {
      socket.onConversationJoined(callbacks.onConversationJoined);
    }
    if (callbacks.onConversationLeft) {
      socket.onConversationLeft(callbacks.onConversationLeft);
    }
    if (callbacks.onReadConfirmed) {
      socket.onReadConfirmed(callbacks.onReadConfirmed);
    }
    if (callbacks.onMessageRead) {
      socket.onMessageRead(callbacks.onMessageRead);
    }
    if (callbacks.onMessageDeleted) {
      socket.onMessageDeleted(callbacks.onMessageDeleted);
    }
    if (callbacks.onError) {
      socket.onError(callbacks.onError);
    }
    if (callbacks.onConnected) {
      socket.onConnected(callbacks.onConnected);
    }
    if (callbacks.onNotificationNew) {
      socket.onNotificationNew(callbacks.onNotificationNew);
    }
    if (callbacks.onNotificationUnreadCount) {
      socket.onNotificationUnreadCount(callbacks.onNotificationUnreadCount);
    }

    return () => {
      if (callbacks.onNewMessage) {
        socket.offNewMessage(callbacks.onNewMessage);
      }
      if (callbacks.onUserTyping) {
        socket.offUserTyping(callbacks.onUserTyping);
      }
      if (callbacks.onConversationJoined) {
        socket.offConversationJoined(callbacks.onConversationJoined);
      }
      if (callbacks.onConversationLeft) {
        socket.offConversationLeft(callbacks.onConversationLeft);
      }
      if (callbacks.onReadConfirmed) {
        socket.offReadConfirmed(callbacks.onReadConfirmed);
      }
      if (callbacks.onMessageRead) {
        socket.offMessageRead(callbacks.onMessageRead);
      }
      if (callbacks.onMessageDeleted) {
        socket.offMessageDeleted(callbacks.onMessageDeleted);
      }
      if (callbacks.onError) {
        socket.offError(callbacks.onError);
      }
      if (callbacks.onConnected) {
        socket.offConnected(callbacks.onConnected);
      }
      if (callbacks.onNotificationNew) {
        socket.offNotificationNew(callbacks.onNotificationNew);
      }
      if (callbacks.onNotificationUnreadCount) {
        socket.offNotificationUnreadCount(callbacks.onNotificationUnreadCount);
      }
    };
  };

  return {
    socket,
    setupListeners,
    joinConversation: socket.joinConversation.bind(socket),
    leaveConversation: socket.leaveConversation.bind(socket),
    sendTyping: socket.sendTyping.bind(socket),
    markRead: socket.markRead.bind(socket),
    isConnected: socket.isConnected.bind(socket),
    getSocketId: socket.getSocketId.bind(socket),
  };
};
