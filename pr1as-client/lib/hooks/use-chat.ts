"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import {
  chatService,
  type ChatListParams,
  type DirectMessageParams,
  type GroupMessageParams,
} from "@/services/chat.service"

export function useDirectConversations(params?: ChatListParams) {
  return useQuery({
    queryKey: queryKeys.chat.directConversations(params),
    queryFn: () => chatService.listConversations(params),
    staleTime: 20_000,
  })
}

export function useDirectConversation(conversationId?: string) {
  return useQuery({
    queryKey: queryKeys.chat.directConversation(conversationId ?? ""),
    enabled: Boolean(conversationId),
    queryFn: () => chatService.getConversation(conversationId as string),
    staleTime: 20_000,
  })
}

export function useDirectMessages(
  conversationId?: string,
  params?: Omit<DirectMessageParams, "conversation_id">
) {
  return useQuery({
    queryKey: queryKeys.chat.directMessages(conversationId ?? "", params),
    enabled: Boolean(conversationId),
    queryFn: () =>
      chatService.listMessages({ ...params, conversation_id: conversationId }),
    staleTime: 10_000,
  })
}

export function useSendDirectMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: chatService.sendMessage,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.directConversationsRoot,
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.directConversation(data.conversation._id),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.directMessagesRoot,
      })
    },
  })
}

export function useMarkDirectMessagesRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: chatService.markAsRead,
    onSuccess: (_data, variables) => {
      if (variables.conversation_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.chat.directMessagesRoot,
        })
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.directConversationsRoot,
      })
    },
  })
}

export function useDeleteDirectMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: chatService.deleteMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.directMessagesRoot,
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.directConversationsRoot,
      })
    },
  })
}

export function useGroupConversations(params?: ChatListParams) {
  return useQuery({
    queryKey: queryKeys.chat.groupConversations(params),
    queryFn: () => chatService.listGroupConversations(params),
    staleTime: 20_000,
  })
}

export function useGroupConversation(conversationGroupId?: string) {
  return useQuery({
    queryKey: queryKeys.chat.groupConversation(conversationGroupId ?? ""),
    enabled: Boolean(conversationGroupId),
    queryFn: () =>
      chatService.getGroupConversation(conversationGroupId as string),
    staleTime: 20_000,
  })
}

export function useGroupMessages(
  conversationGroupId?: string,
  params?: Omit<GroupMessageParams, "conversation_group_id">
) {
  return useQuery({
    queryKey: queryKeys.chat.groupMessages(conversationGroupId ?? "", params),
    enabled: Boolean(conversationGroupId),
    queryFn: () =>
      chatService.listGroupMessages({
        ...params,
        conversation_group_id: conversationGroupId,
      }),
    staleTime: 10_000,
  })
}

export function useSendGroupMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: chatService.sendGroupMessage,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.groupConversationsRoot,
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.groupConversation(data.conversation._id),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.groupMessagesRoot,
      })
    },
  })
}

export function useMarkGroupMessagesRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: chatService.markGroupAsRead,
    onSuccess: (_data, variables) => {
      if (variables.conversation_group_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.chat.groupMessagesRoot,
        })
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.chat.groupConversationsRoot,
      })
    },
  })
}
