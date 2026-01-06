"use client";

import { useEffect, useRef } from "react";
import { chatSocket, ChatSocket } from "../socket";
import type {
  NewMessageData,
  UserTypingData,
  ConversationJoinedData,
  ConversationLeftData,
  ReadConfirmedData,
  SocketErrorData,
} from "../socket";

export const useSocket = () => {
  const socketRef = useRef<ChatSocket>(chatSocket);

  useEffect(() => {
    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  return socketRef.current;
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
  }) => {
    useEffect(() => {
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
      };
    }, [
      socket,
      callbacks.onNewMessage,
      callbacks.onUserTyping,
      callbacks.onConversationJoined,
      callbacks.onConversationLeft,
      callbacks.onReadConfirmed,
      callbacks.onMessageRead,
      callbacks.onMessageDeleted,
      callbacks.onError,
      callbacks.onConnected,
    ]);
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
