import { api } from "@/lib/axios"
import { localizeServerMessage } from "@/lib/utils/error-handler"

type ApiResponse<T> = {
  success: boolean
  statusCode?: number
  message?: string
  data?: T
}

export type MessageType = "text" | "image" | "video" | "audio" | "file"

export type ChatMessage = {
  _id: string
  conversation_id: string
  sender_id: string
  receiver_id: string
  type: MessageType
  content: string
  is_read: boolean
  is_deleted: boolean
  read_at: string | null
  reply_to_id: string | null
  created_at: string
  updated_at: string
}

export type ChatConversation = {
  _id: string
  sender_id: string
  receiver_id: string
  last_message: string | null
  created_at: string
  updated_at: string
  last_message_data?: ChatMessage
  other_user?: {
    _id: string
    full_name: string | null
    avatar: string | null
    email: string
    is_blocked?: boolean
    has_blocked_me?: boolean
    block_profile?: boolean
    meta_data?: {
      pricing_plan_code?: string | null
    }
  }
  unread_count?: number
}

export type GroupChatMessage = {
  _id: string
  conversation_group_id: string
  sender_id: string
  type: MessageType
  content: string
  read_by: Array<{ user_id: string; read_at: string }>
  is_deleted: boolean
  reply_to_id: string | null
  created_at: string
  updated_at: string
}

export type GroupChatMember = {
  _id: string
  full_name: string | null
  avatar: string | null
  email: string
  roles: string[]
}

export type GroupChatBooking = {
  _id: string
  service_code: string
  status: string
  schedule: {
    start_time: string
    end_time: string
    duration_hours: number
  }
  pricing: {
    unit: string
    quantity: number
  }
  client_id: string
  worker_id: string
  client?: GroupChatMember
  worker?: GroupChatMember
  dispute?: {
    reason: string
    description: string
    evidence_urls: string[]
    disputed_by: string
    disputed_at: string
    resolution: string | null
    resolution_notes: string
    resolved_by: string | null
    resolved_at: string | null
  } | null
  disputed_at: string | null
}

export type GroupChatConversation = {
  _id: string
  booking_id: string
  name: string
  members: string[]
  last_message: string | null
  created_at: string
  updated_at: string
  last_message_data?: GroupChatMessage
  unread_count?: number
  members_data?: GroupChatMember[]
  booking_data?: GroupChatBooking
}

export type ChatListParams = {
  page?: number
  limit?: number
}

export type DirectMessageParams = ChatListParams & {
  conversation_id?: string
  receiver_id?: string
}

export type GroupMessageParams = ChatListParams & {
  booking_id?: string
  conversation_group_id?: string
}

export type DirectConversationListResult = {
  conversations: ChatConversation[]
  total: number
  page: number
  limit: number
}

export type GroupConversationListResult = {
  conversations: GroupChatConversation[]
  total: number
  page: number
  limit: number
}

export type DirectMessageListResult = {
  messages: ChatMessage[]
  total: number
  page: number
  limit: number
}

export type GroupMessageListResult = {
  messages: GroupChatMessage[]
  total: number
  page: number
  limit: number
}

export type SendDirectMessagePayload = {
  receiver_id: string
  content: string
  type?: MessageType
  reply_to_id?: string | null
}

export type SendGroupMessagePayload = {
  booking_id: string
  content: string
  type?: MessageType
  reply_to_id?: string | null
}

export type SendDirectMessageResult = {
  message: ChatMessage
  conversation: ChatConversation
}

export type AdminContact = {
  _id: string
  full_name: string | null
  avatar: string | null
  email: string
}

export type SendGroupMessageResult = {
  message: GroupChatMessage
  conversation: GroupChatConversation
}

const emptyDirectConversations: DirectConversationListResult = {
  conversations: [],
  total: 0,
  page: 1,
  limit: 20,
}

const emptyGroupConversations: GroupConversationListResult = {
  conversations: [],
  total: 0,
  page: 1,
  limit: 20,
}

const emptyDirectMessages: DirectMessageListResult = {
  messages: [],
  total: 0,
  page: 1,
  limit: 50,
}

const emptyGroupMessages: GroupMessageListResult = {
  messages: [],
  total: 0,
  page: 1,
  limit: 50,
}

export const chatService = {
  listConversations: async (params?: ChatListParams) => {
    const response = await api.get<ApiResponse<DirectConversationListResult>>(
      "/chat/conversations",
      { params }
    )
    return response.data.data ?? emptyDirectConversations
  },

  getConversation: async (conversationId: string) => {
    const response = await api.get<
      ApiResponse<{ conversation: ChatConversation }>
    >(`/chat/conversations/${conversationId}`)
    return response.data.data?.conversation ?? null
  },

  listMessages: async (params: DirectMessageParams) => {
    const response = await api.get<ApiResponse<DirectMessageListResult>>(
      "/chat/messages",
      { params }
    )
    return response.data.data ?? emptyDirectMessages
  },

  sendMessage: async (payload: SendDirectMessagePayload) => {
    const response = await api.post<ApiResponse<SendDirectMessageResult>>(
      "/chat/messages",
      {
        ...payload,
        type: payload.type ?? "text",
      }
    )
    if (!response.data.data) {
      throw new Error(
        localizeServerMessage(response.data.message, "Không thể gửi tin nhắn.")
      )
    }
    return response.data.data
  },

  markAsRead: async (payload: {
    message_ids?: string[]
    conversation_id?: string
  }) => {
    const response = await api.patch<ApiResponse<{ updated_count: number }>>(
      "/chat/messages/read",
      payload
    )
    return response.data.data ?? { updated_count: 0 }
  },

  deleteMessage: async (messageId: string) => {
    const response = await api.delete<ApiResponse<{ success: boolean }>>(
      `/chat/messages/${messageId}`
    )
    return response.data.data ?? { success: false }
  },

  listGroupConversations: async (params?: ChatListParams) => {
    const response = await api.get<ApiResponse<GroupConversationListResult>>(
      "/chat/group/conversations",
      { params }
    )
    return response.data.data ?? emptyGroupConversations
  },

  getGroupConversation: async (conversationGroupId: string) => {
    const response = await api.get<
      ApiResponse<{ conversation: GroupChatConversation }>
    >(`/chat/group/conversations/${conversationGroupId}`)
    return response.data.data?.conversation ?? null
  },

  listGroupMessages: async (params: GroupMessageParams) => {
    const response = await api.get<ApiResponse<GroupMessageListResult>>(
      "/chat/group/messages",
      { params }
    )
    return response.data.data ?? emptyGroupMessages
  },

  sendGroupMessage: async (payload: SendGroupMessagePayload) => {
    const response = await api.post<ApiResponse<SendGroupMessageResult>>(
      "/chat/group/messages",
      {
        ...payload,
        type: payload.type ?? "text",
      }
    )
    if (!response.data.data) {
      throw new Error(
        localizeServerMessage(response.data.message, "Không thể gửi tin nhắn nhóm.")
      )
    }
    return response.data.data
  },

  markGroupAsRead: async (payload: {
    message_ids?: string[]
    conversation_group_id?: string
  }) => {
    const response = await api.patch<ApiResponse<{ updated_count: number }>>(
      "/chat/group/messages/read",
      payload
    )
    return response.data.data ?? { updated_count: 0 }
  },

  getAdminContact: async () => {
    const response = await api.get<ApiResponse<{ admin: AdminContact | null }>>(
      "/chat/admin-contact"
    )
    return response.data.data?.admin ?? null
  },

  createComplaintConversation: async (booking_id: string) => {
    const response = await api.post<
      ApiResponse<{ conversation: GroupChatConversation }>
    >("/chat/group/complaint", { booking_id })
    const conversation = response.data.data?.conversation
    if (!conversation) {
      throw new Error(
        localizeServerMessage(response.data.message, "Không thể mở nhóm khiếu nại.")
      )
    }
    return conversation
  },
}
