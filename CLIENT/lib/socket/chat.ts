"use client";

import { Socket } from "socket.io-client";
import { SocketEvent } from "../constants/socket-events";
import { getSocket } from "./config";

export interface JoinConversationData {
  conversation_id: string;
}

export interface LeaveConversationData {
  conversation_id: string;
}

export interface TypingData {
  conversation_id: string;
  is_typing: boolean;
}

export interface MarkReadData {
  message_ids?: string[];
  conversation_id?: string;
}

export interface NewMessageData {
  message: {
    _id: string;
    sender_id: string;
    receiver_id: string;
    conversation_id: string;
    content: string;
    type?: string;
    is_read: boolean;
    reply_to_id?: string | null;
    created_at: string;
    updated_at: string;
  };
  conversation?: any;
}

export interface UserTypingData {
  user_id: string;
  conversation_id: string;
  is_typing: boolean;
}

export interface ConversationJoinedData {
  conversation_id: string;
}

export interface ConversationLeftData {
  conversation_id: string;
}

export interface ReadConfirmedData {
  message_ids?: string[];
  conversation_id?: string;
}

export interface SocketErrorData {
  message: string;
  code?: string;
}

export class ChatSocket {
  private socket: Socket | null;

  constructor() {
    this.socket = getSocket();
  }

  private getSocketInstance(): Socket | null {
    const latestSocket = getSocket();
    this.socket = latestSocket;
    return this.socket;
  }

  joinConversation(data: JoinConversationData): void {
    const socket = this.getSocketInstance();
    if (socket) {
      socket.emit(SocketEvent.JOIN_CONVERSATION, data);
    }
  }

  leaveConversation(data: LeaveConversationData): void {
    const socket = this.getSocketInstance();
    if (socket) {
      socket.emit(SocketEvent.LEAVE_CONVERSATION, data);
    }
  }

  sendTyping(data: TypingData): void {
    const socket = this.getSocketInstance();
    if (socket) {
      socket.emit(SocketEvent.TYPING, data);
    }
  }

  markRead(data: MarkReadData): void {
    const socket = this.getSocketInstance();
    if (socket) {
      socket.emit(SocketEvent.MARK_READ, data);
    }
  }

  onNewMessage(callback: (data: NewMessageData) => void): void {
    const socket = this.getSocketInstance();
    if (socket) {
      socket.on(SocketEvent.NEW_MESSAGE, callback);
    }
  }

  offNewMessage(callback?: (data: NewMessageData) => void): void {
    const socket = this.getSocketInstance();
    if (socket) {
      socket.off(SocketEvent.NEW_MESSAGE, callback);
    }
  }

  onUserTyping(callback: (data: UserTypingData) => void): void {
    const socket = this.getSocketInstance();
    if (socket) {
      socket.on(SocketEvent.USER_TYPING, callback);
    }
  }

  offUserTyping(callback?: (data: UserTypingData) => void): void {
    const socket = this.getSocketInstance();
    if (socket) {
      socket.off(SocketEvent.USER_TYPING, callback);
    }
  }

  onConversationJoined(callback: (data: ConversationJoinedData) => void): void {
    const socket = this.getSocketInstance();
    if (socket) {
      socket.on(SocketEvent.CONVERSATION_JOINED, callback);
    }
  }

  offConversationJoined(
    callback?: (data: ConversationJoinedData) => void
  ): void {
    const socket = this.getSocketInstance();
    if (socket) {
      socket.off(SocketEvent.CONVERSATION_JOINED, callback);
    }
  }

  onConversationLeft(callback: (data: ConversationLeftData) => void): void {
    const socket = this.getSocketInstance();
    if (socket) {
      socket.on(SocketEvent.CONVERSATION_LEFT, callback);
    }
  }

  offConversationLeft(callback?: (data: ConversationLeftData) => void): void {
    const socket = this.getSocketInstance();
    if (socket) {
      socket.off(SocketEvent.CONVERSATION_LEFT, callback);
    }
  }

  onReadConfirmed(callback: (data: ReadConfirmedData) => void): void {
    const socket = this.getSocketInstance();
    if (socket) {
      socket.on(SocketEvent.READ_CONFIRMED, callback);
    }
  }

  offReadConfirmed(callback?: (data: ReadConfirmedData) => void): void {
    const socket = this.getSocketInstance();
    if (socket) {
      socket.off(SocketEvent.READ_CONFIRMED, callback);
    }
  }

  onMessageRead(callback: (data: NewMessageData) => void): void {
    const socket = this.getSocketInstance();
    if (socket) {
      socket.on(SocketEvent.MESSAGE_READ, callback);
    }
  }

  offMessageRead(callback?: (data: NewMessageData) => void): void {
    const socket = this.getSocketInstance();
    if (socket) {
      socket.off(SocketEvent.MESSAGE_READ, callback);
    }
  }

  onMessageDeleted(callback: (data: { message_id: string }) => void): void {
    const socket = this.getSocketInstance();
    if (socket) {
      socket.on(SocketEvent.MESSAGE_DELETED, callback);
    }
  }

  offMessageDeleted(callback?: (data: { message_id: string }) => void): void {
    const socket = this.getSocketInstance();
    if (socket) {
      socket.off(SocketEvent.MESSAGE_DELETED, callback);
    }
  }

  onError(callback: (data: SocketErrorData) => void): void {
    const socket = this.getSocketInstance();
    if (socket) {
      socket.on(SocketEvent.ERROR, callback);
    }
  }

  offError(callback?: (data: SocketErrorData) => void): void {
    const socket = this.getSocketInstance();
    if (socket) {
      socket.off(SocketEvent.ERROR, callback);
    }
  }

  onConnected(callback: (data: { user_id: string }) => void): void {
    const socket = this.getSocketInstance();
    if (socket) {
      socket.on(SocketEvent.CONNECTED, callback);
    }
  }

  offConnected(callback?: (data: { user_id: string }) => void): void {
    const socket = this.getSocketInstance();
    if (socket) {
      socket.off(SocketEvent.CONNECTED, callback);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    const socket = this.getSocketInstance();
    return socket?.connected || false;
  }

  getSocketId(): string | null {
    const socket = this.getSocketInstance();
    return socket?.id || null;
  }
}

export const chatSocket = new ChatSocket();
