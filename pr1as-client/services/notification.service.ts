import { api } from "@/lib/axios"

type ApiResponse<T> = {
  success: boolean
  statusCode?: number
  message?: string
  data?: T
}

export type Notification = {
  id: string
  recipient_id: string
  type: string
  title: string
  body: string
  data?: Record<string, unknown>
  is_read: boolean
  created_at: string
  updated_at: string
}

export type NotificationListResult = {
  data: Notification[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export type UnreadCountResult = {
  unread_count: number
}

export const notificationService = {
  list: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get<ApiResponse<NotificationListResult>>("/notifications", { params })
    return response.data.data ?? { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false } }
  },

  getUnreadCount: async () => {
    const response = await api.get<ApiResponse<UnreadCountResult>>("/notifications/unread-count")
    return response.data.data ?? { unread_count: 0 }
  },

  markAsRead: async (id: string) => {
    const { data } = await api.patch(`/notifications/${id}/read`)
    return data
  },

  markAllAsRead: async () => {
    const { data } = await api.patch("/notifications/read-all")
    return data
  },
}
