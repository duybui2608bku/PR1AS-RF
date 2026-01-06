"use client";

import { api, extractData } from "../axios/index";
import type { ApiResponse } from "../axios";
import { ApiEndpoint, buildEndpoint } from "../constants/api-endpoints";

export type MessageType = "text" | "image" | "video" | "audio" | "file";

export interface SendMessageInput {
  receiver_id: string;
  content: string;
  type: MessageType;
  conversation_id?: string;
  reply_to_id?: string | null;
}

export interface Message {
  _id: string;
  sender_id: string;
  receiver_id: string;
  conversation_id: string;
  content: string;
  type: MessageType;
  is_read: boolean;
  reply_to_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  participant_ids: string[];
  last_message?: Message;
  unread_count?: number;
  created_at: string;
  updated_at: string;
  other_user?: {
    id: string;
    full_name: string;
    avatar: string | null;
    email: string;
  };
}

export interface ApiConversation {
  _id: string;
  sender_id: string;
  receiver_id: string;
  last_message?: string;
  last_message_data?: {
    _id: string;
    conversation_id: string;
    sender_id: string;
    receiver_id: string;
    type: string;
    content: string;
    is_read: boolean;
    read_at: string | null;
    reply_to_id: string | null;
    created_at: string;
    updated_at: string;
  };
  other_user?: {
    _id: string;
    full_name: string;
    avatar: string | null;
    email: string;
  };
  unread_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ApiGetConversationsResponse {
  conversations: ApiConversation[];
  total: number;
  page: number;
  limit: number;
}

export interface GetMessagesQuery {
  conversation_id?: string;
  receiver_id?: string;
  page?: number;
  limit?: number;
}

export interface GetMessagesResponse {
  messages: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetConversationsQuery {
  page?: number;
  limit?: number;
}

export interface GetConversationsResponse {
  conversations: Conversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MarkAsReadInput {
  message_ids?: string[];
  conversation_id?: string;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export const chatApi = {
  sendMessage: async (data: SendMessageInput): Promise<Message> => {
    const response = await api.post<ApiResponse<Message>>(
      ApiEndpoint.CHAT_MESSAGES,
      data
    );
    return extractData(response);
  },

  getMessages: async (
    query?: GetMessagesQuery
  ): Promise<GetMessagesResponse> => {
    const response = await api.get<ApiResponse<GetMessagesResponse>>(
      ApiEndpoint.CHAT_MESSAGES,
      { params: query }
    );
    return extractData(response);
  },

  getConversations: async (
    query?: GetConversationsQuery
  ): Promise<GetConversationsResponse> => {
    const response = await api.get<ApiResponse<ApiGetConversationsResponse>>(
      ApiEndpoint.CHAT_CONVERSATIONS,
      { params: query }
    );
    const data = extractData(response);
    const conversations: Conversation[] = data.conversations.map((conv) => {
      const participantIds = [conv.sender_id, conv.receiver_id].filter(Boolean);

      let lastMessage: Message | undefined;
      if (conv.last_message_data) {
        lastMessage = {
          _id: conv.last_message_data._id,
          sender_id: conv.last_message_data.sender_id,
          receiver_id: conv.last_message_data.receiver_id,
          conversation_id: conv.last_message_data.conversation_id,
          content: conv.last_message_data.content,
          type: conv.last_message_data.type as MessageType,
          is_read: conv.last_message_data.is_read,
          created_at: conv.last_message_data.created_at,
          updated_at: conv.last_message_data.updated_at,
        };
      }

      return {
        id: conv._id,
        participant_ids: participantIds,
        last_message: lastMessage,
        unread_count: conv.unread_count || 0,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        other_user: conv.other_user
          ? {
              id: conv.other_user._id,
              full_name: conv.other_user.full_name,
              avatar: conv.other_user.avatar,
              email: conv.other_user.email,
            }
          : undefined,
      };
    });

    return {
      conversations,
      pagination: {
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: Math.ceil(data.total / data.limit),
      },
    };
  },

  getConversation: async (conversationId: string): Promise<Conversation> => {
    const response = await api.get<ApiResponse<{ conversation: Conversation }>>(
      buildEndpoint(ApiEndpoint.CHAT_CONVERSATIONS_BY_ID, {
        conversation_id: conversationId,
      })
    );
    return extractData(response).conversation;
  },

  markAsRead: async (data: MarkAsReadInput): Promise<void> => {
    await api.patch<ApiResponse<void>>(ApiEndpoint.CHAT_MESSAGES_READ, data);
  },

  getUnreadCount: async (
    conversationId?: string
  ): Promise<UnreadCountResponse> => {
    const response = await api.get<ApiResponse<UnreadCountResponse>>(
      ApiEndpoint.CHAT_MESSAGES_UNREAD,
      { params: conversationId ? { conversation_id: conversationId } : {} }
    );
    return extractData(response);
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    await api.delete<ApiResponse<void>>(
      buildEndpoint(ApiEndpoint.CHAT_MESSAGES_BY_ID, {
        message_id: messageId,
      })
    );
  },
};
