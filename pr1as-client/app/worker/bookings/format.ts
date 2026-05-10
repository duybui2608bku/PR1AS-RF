import {
  BookingStatus,
  CancellationReason,
  CancelledBy,
  type Booking,
} from "@/types/booking"

export const bookingStatusLabel: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: "Chờ xác nhận",
  [BookingStatus.CONFIRMED]: "Đã xác nhận",
  [BookingStatus.IN_PROGRESS]: "Đang thực hiện",
  [BookingStatus.PENDING_CLIENT_ACCEPTANCE]: "Chờ khách xác nhận",
  [BookingStatus.COMPLETED]: "Hoàn thành",
  [BookingStatus.CANCELLED]: "Đã hủy",
  [BookingStatus.REJECTED]: "Bị từ chối",
  [BookingStatus.DISPUTED]: "Đang khiếu nại",
  [BookingStatus.EXPIRED]: "Đã hết hạn",
}

export const bookingStatusBadgeClass: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: "border-amber-200 bg-amber-50 text-amber-700",
  [BookingStatus.CONFIRMED]: "border-blue-200 bg-blue-50 text-blue-700",
  [BookingStatus.IN_PROGRESS]: "border-indigo-200 bg-indigo-50 text-indigo-700",
  [BookingStatus.PENDING_CLIENT_ACCEPTANCE]:
    "border-violet-200 bg-violet-50 text-violet-700",
  [BookingStatus.COMPLETED]:
    "border-emerald-200 bg-emerald-50 text-emerald-700",
  [BookingStatus.CANCELLED]: "border-muted bg-muted text-muted-foreground",
  [BookingStatus.REJECTED]: "border-red-200 bg-red-50 text-red-700",
  [BookingStatus.DISPUTED]: "border-orange-200 bg-orange-50 text-orange-700",
  [BookingStatus.EXPIRED]: "border-muted bg-muted text-muted-foreground",
}

export const cancellationReasonLabel: Record<CancellationReason, string> = {
  [CancellationReason.CLIENT_REQUEST]: "Khách hàng yêu cầu",
  [CancellationReason.WORKER_UNAVAILABLE]: "Worker không có sẵn",
  [CancellationReason.SCHEDULE_CONFLICT]: "Trùng lịch",
  [CancellationReason.EMERGENCY]: "Khẩn cấp",
  [CancellationReason.POLICY_VIOLATION]: "Vi phạm chính sách",
  [CancellationReason.OTHER]: "Khác",
}

export const cancelledByLabel: Record<CancelledBy, string> = {
  [CancelledBy.CLIENT]: "Khách hàng",
  [CancelledBy.WORKER]: "Worker",
  [CancelledBy.ADMIN]: "Quản trị viên",
  [CancelledBy.SYSTEM]: "Hệ thống",
}

export const formatDateTime = (value?: string | null): string => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export const isBookingExpired = (
  schedule: Booking["schedule"],
  status: BookingStatus,
  createdAt?: string | null
): boolean => {
  if (status === BookingStatus.EXPIRED) return true
  if (status !== BookingStatus.PENDING) return false
  const startTime = new Date(schedule.start_time).getTime()
  const createdTime = createdAt ? new Date(createdAt).getTime() : Number.NaN
  if (Number.isNaN(startTime)) return false
  if (Number.isNaN(createdTime)) return startTime < Date.now()

  const confirmDeadlineBeforeStartMs = 6 * 60 * 60 * 1000
  const shortNoticeConfirmMs = 60 * 60 * 1000
  const beforeStartDeadline = startTime - confirmDeadlineBeforeStartMs
  const deadline =
    beforeStartDeadline <= createdTime
      ? createdTime + shortNoticeConfirmMs
      : beforeStartDeadline

  return deadline <= Date.now()
}

export const getBookingId = (booking: Booking): string =>
  booking.id ?? booking._id

export const getClientName = (client: Booking["client_id"]): string => {
  if (!client) return "-"
  if (typeof client === "string") return client
  return client.full_name || client.email || "-"
}

export const getServiceLabel = (booking: Booking): string => {
  const service = booking.service_id
  if (!service || typeof service === "string") return booking.service_code
  const name = service.name
  if (typeof name === "string") return name
  if (name && typeof name === "object") {
    return name.vi || name.en || service.code || booking.service_code
  }
  return service.code || booking.service_code
}
