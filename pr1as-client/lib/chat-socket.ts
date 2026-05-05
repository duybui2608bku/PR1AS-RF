"use client"

import { io, type Socket } from "socket.io-client"

import type {
  ChatConversation,
  ChatMessage,
  GroupChatConversation,
  GroupChatMessage,
} from "@/services/chat.service"

export type ChatMode = "direct" | "group"

export type DirectReadPayload = {
  conversation_id: string
  read_by: string
  read_at: string
}

export type GroupReadPayload = {
  conversation_group_id: string
  read_by: string
  read_at: string
}

export type ServerToClientEvents = {
  connected: (payload: { user_id: string }) => void
  conversation_joined: (payload: { conversation_id: string }) => void
  conversation_left: (payload: { conversation_id: string }) => void
  group_conversation_joined: (payload: {
    conversation_group_id: string
  }) => void
  group_conversation_left: (payload: { conversation_group_id: string }) => void
  new_message: (
    payload:
      | { message: ChatMessage; conversation: ChatConversation }
      | { message: GroupChatMessage; conversation: GroupChatConversation }
  ) => void
  message_deleted: (payload: {
    message_id: string
    conversation_id: string
  }) => void
  message_read: (payload: DirectReadPayload | GroupReadPayload) => void
  messages_read: (payload: DirectReadPayload) => void
  group_messages_read: (payload: GroupReadPayload) => void
  read_confirmed: (payload: { updated_count: number }) => void
  group_read_confirmed: (payload: { updated_count: number }) => void
  user_typing: (payload: {
    conversation_id: string
    user_id: string
    is_typing: boolean
  }) => void
  group_user_typing: (payload: {
    conversation_group_id: string
    user_id: string
    is_typing: boolean
  }) => void
  error: (payload: { message?: string } | Error) => void
}

export type ClientToServerEvents = {
  join_conversation: (payload: { conversation_id: string }) => void
  leave_conversation: (payload: { conversation_id: string }) => void
  typing: (payload: { conversation_id: string; is_typing: boolean }) => void
  mark_read: (payload: {
    message_ids?: string[]
    conversation_id?: string
  }) => void
  join_group_conversation: (payload: { conversation_group_id: string }) => void
  leave_group_conversation: (payload: { conversation_group_id: string }) => void
  group_typing: (payload: {
    conversation_group_id: string
    is_typing: boolean
  }) => void
  mark_group_read: (payload: {
    message_ids?: string[]
    conversation_group_id?: string
  }) => void
}

export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let chatSocket: ChatSocket | null = null
let activeToken: string | null = null

const getSocketBaseUrl = () => {
  const explicitSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL
  if (explicitSocketUrl) {
    return explicitSocketUrl
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (apiUrl) {
    return apiUrl.replace(/\/api\/?$/, "")
  }

  return "http://localhost:3001"
}

export const getChatSocket = (token: string): ChatSocket => {
  if (chatSocket && activeToken === token) {
    return chatSocket
  }

  if (chatSocket) {
    chatSocket.disconnect()
  }

  activeToken = token
  chatSocket = io(getSocketBaseUrl(), {
    autoConnect: false,
    auth: { token },
    transports: ["websocket", "polling"],
    withCredentials: true,
  })

  return chatSocket
}

export const disconnectChatSocket = () => {
  if (chatSocket) {
    chatSocket.disconnect()
  }

  chatSocket = null
  activeToken = null
}
