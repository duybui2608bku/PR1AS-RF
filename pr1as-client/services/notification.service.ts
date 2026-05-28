import { api } from "@/lib/axios"
import { localizeServerMessage } from "@/lib/utils/error-handler"

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
  link?: string | null
  read_at?: string | null
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

const NOTIFICATION_FALLBACKS: Record<string, { title: string; body: string }> = {
  "booking.created": {
    title: "Yêu cầu đặt lịch mới",
    body: "Bạn vừa nhận được một yêu cầu đặt lịch mới.",
  },
  "booking.cancelled": {
    title: "Booking đã bị hủy",
    body: "Một booking đã bị hủy.",
  },
  "booking.updated": {
    title: "Booking đã được cập nhật",
    body: "Thông tin booking đã được cập nhật.",
  },
  "chat.message": {
    title: "Tin nhắn mới",
    body: "Bạn có tin nhắn mới.",
  },
  "chat.group_message": {
    title: "Tin nhắn nhóm mới",
    body: "Bạn có tin nhắn mới trong nhóm.",
  },
  "dispute.created": {
    title: "Có khiếu nại booking mới",
    body: "Một khiếu nại mới đã được tạo cho booking.",
  },
  "dispute.resolved": {
    title: "Khiếu nại booking đã được xử lý",
    body: "Khiếu nại booking đã được xử lý.",
  },
  "review.created": {
    title: "Đánh giá mới",
    body: "Một đánh giá mới đã được gửi cho booking của bạn.",
  },
  "review.updated": {
    title: "Đánh giá đã được cập nhật",
    body: "Một đánh giá về booking của bạn đã được cập nhật.",
  },
  "wallet.deposit_failed": {
    title: "Nạp tiền thất bại",
    body: "Giao dịch nạp tiền thất bại.",
  },
  "wallet.deposit_success": {
    title: "Nạp tiền thành công",
    body: "Số dư ví của bạn đã được cập nhật.",
  },
  "wallet.hold_created": {
    title: "Tạm giữ số dư",
    body: "Một khoản tiền đã được tạm giữ cho booking của bạn.",
  },
  "wallet.refund_created": {
    title: "Hoàn tiền",
    body: "Số tiền hoàn đã được cộng vào ví của bạn.",
  },
}

const BOOKING_STATUS_FALLBACKS: Record<string, { title: string; body: string }> = {
  cancelled: {
    title: "Booking đã bị hủy",
    body: "Booking đã bị hủy.",
  },
  completed: {
    title: "Booking đã hoàn thành",
    body: "Booking đã hoàn thành thành công.",
  },
  confirmed: {
    title: "Booking đã được xác nhận",
    body: "Booking của bạn đã được worker xác nhận.",
  },
  disputed: {
    title: "Booking đang tranh chấp",
    body: "Một khiếu nại đã được mở cho booking này.",
  },
  expired: {
    title: "Booking đã hết hạn",
    body: "Booking đã hết hạn.",
  },
  in_progress: {
    title: "Booking đang thực hiện",
    body: "Booking đã bắt đầu và đang được thực hiện.",
  },
  pending_client_acceptance: {
    title: "Booking chờ xác nhận hoàn thành",
    body: "Worker đã báo hoàn thành. Vui lòng xác nhận hoặc khiếu nại nếu cần.",
  },
  rejected: {
    title: "Booking bị từ chối",
    body: "Yêu cầu booking đã bị từ chối.",
  },
}

const isProbablyEnglish = (value: string): boolean =>
  /^[\x00-\x7F]*$/.test(value) && /[A-Za-z]/.test(value)

const getNotificationFallback = (notification: Notification) => {
  if (notification.type === "booking.status_updated") {
    const status = String(notification.data?.status ?? "").toLowerCase()
    return BOOKING_STATUS_FALLBACKS[status] ?? {
      title: "Trạng thái booking đã cập nhật",
      body: "Trạng thái booking của bạn đã được cập nhật.",
    }
  }

  return NOTIFICATION_FALLBACKS[notification.type]
}

const localizeNotificationText = (
  value: string,
  fallback: string | undefined
): string => {
  const localized = localizeServerMessage(value, fallback ?? value)
  if (fallback && localized === value.trim() && isProbablyEnglish(localized)) {
    return fallback
  }
  return localized
}

const normalizeNotification = (raw: Notification): Notification => {
  const fallback = getNotificationFallback(raw)
  return {
    ...raw,
    is_read: raw.read_at !== null && raw.read_at !== undefined,
    link: raw.link ?? null,
    title: localizeNotificationText(raw.title, fallback?.title),
    body: localizeNotificationText(raw.body, fallback?.body),
  }
}

export const notificationService = {
  list: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get<ApiResponse<NotificationListResult>>("/notifications", { params })
    const result = response.data.data ?? { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false } }
    return {
      ...result,
      data: result.data.map(normalizeNotification),
    }
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

  markAsReadByConversation: async (params: {
    conversation_id?: string
    conversation_group_id?: string
  }) => {
    const { data } = await api.patch("/notifications/read-by-conversation", params)
    return data
  },
}
