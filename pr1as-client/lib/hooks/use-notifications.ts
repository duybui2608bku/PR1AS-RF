import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { notificationService } from "@/services/notification.service"
import { useAuthStore } from "@/lib/store/auth-store"

export const NOTIFICATION_KEYS = {
  all: ["notifications"] as const,
  list: (params?: { page?: number; limit?: number }) =>
    [...NOTIFICATION_KEYS.all, "list", params] as const,
  unreadCount: () => [...NOTIFICATION_KEYS.all, "unread-count"] as const,
}

export function useNotifications(params?: { page?: number; limit?: number }) {
  const { isAuthenticated } = useAuthStore()
  return useQuery({
    queryKey: NOTIFICATION_KEYS.list(params),
    queryFn: () => notificationService.list(params),
    enabled: isAuthenticated,
    staleTime: 30_000,
  })
}

export function useUnreadNotificationCount() {
  const { isAuthenticated } = useAuthStore()
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
