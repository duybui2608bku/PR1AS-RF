import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { notificationService } from "@/services/notification.service"
import { useAuthStore, useHasHydrated } from "@/lib/store/auth-store"
import { getChatSocket, disconnectChatSocket } from "@/lib/chat-socket"

export const NOTIFICATION_KEYS = {
  all: ["notifications"] as const,
  list: (params?: { page?: number; limit?: number }) =>
    [...NOTIFICATION_KEYS.all, "list", params] as const,
  unreadCount: () => [...NOTIFICATION_KEYS.all, "unread-count"] as const,
}

export function useNotifications(params?: { page?: number; limit?: number }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: NOTIFICATION_KEYS.list(params),
    queryFn: () => notificationService.list(params),
    enabled: isAuthenticated,
    staleTime: 30_000,
  })
}

export function useUnreadNotificationCount() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: NOTIFICATION_KEYS.unreadCount(),
    queryFn: notificationService.getUnreadCount,
    enabled: isAuthenticated,
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all })
    },
  })
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all })
    },
  })
}

export function useNotificationSocket() {
  const token = useAuthStore((s) => s.token)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasHydrated = useHasHydrated()
  const queryClient = useQueryClient()

  React.useEffect(() => {
    // Không làm gì trước khi Zustand hydrate từ sessionStorage xong.
    // Nếu disconnect socket ở đây trong lúc isAuthenticated còn là initial false,
    // socket singleton sẽ bị null và phải tạo lại khi hydration xong → cascading effects.
    if (!hasHydrated) return

    if (!isAuthenticated) {
      disconnectChatSocket()
      return
    }

    // token có thể null sau reload — getChatSocket sẽ dùng cookie auth
    const socket = getChatSocket(token)

    if (!socket.connected) {
      socket.connect()
    }

    const handleNew = (_payload: unknown) => {
      queryClient.invalidateQueries({ queryKey: [...NOTIFICATION_KEYS.all, "list"] })
    }

    const handleUnreadCount = (payload: { unread_count: number }) => {
      queryClient.setQueryData(NOTIFICATION_KEYS.unreadCount(), {
        unread_count: payload.unread_count,
      })
    }

    socket.on("notification:new", handleNew)
    socket.on("notification:unread_count", handleUnreadCount)

    return () => {
      socket.off("notification:new", handleNew)
      socket.off("notification:unread_count", handleUnreadCount)
    }
  }, [hasHydrated, token, isAuthenticated, queryClient])
}

export function useMarkNotificationsByConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: { conversation_id?: string; conversation_group_id?: string }) =>
      notificationService.markAsReadByConversation(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all })
    },
  })
}
