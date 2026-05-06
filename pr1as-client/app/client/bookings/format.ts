import {
  BookingStatus,
  CancellationReason,
  CancelledBy,
  DisputeReason,
  type Booking,
} from "@/types/booking"

export const formatVnd = (amount: number): string =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount)

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

export const bookingStatusLabel: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]: "Chờ xác nhận",
  [BookingStatus.CONFIRMED]: "Đã xác nhận",
  [BookingStatus.IN_PROGRESS]: "Đang thực hiện",
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
  [BookingStatus.COMPLETED]: "border-emerald-200 bg-emerald-50 text-emerald-700",
  [BookingStatus.CANCELLED]: "border-muted bg-muted text-muted-foreground",
  [BookingStatus.REJECTED]: "border-red-200 bg-red-50 text-red-700",
  [BookingStatus.DISPUTED]: "border-orange-200 bg-orange-50 text-orange-700",
  [BookingStatus.EXPIRED]: "border-muted bg-muted text-muted-foreground",
}

export const cancellationReasonLabel: Record<CancellationReason, string> = {
  [CancellationReason.CLIENT_REQUEST]: "Khách hàng yêu cầu",
  [CancellationReason.WORKER_UNAVAILABLE]: "Thợ không có sẵn",
  [CancellationReason.SCHEDULE_CONFLICT]: "Trùng lịch",
  [CancellationReason.EMERGENCY]: "Khẩn cấp",
  [CancellationReason.PAYMENT_FAILED]: "Thanh toán thất bại",
  [CancellationReason.POLICY_VIOLATION]: "Vi phạm chính sách",
  [CancellationReason.OTHER]: "Khác",
}

export const cancelledByLabel: Record<CancelledBy, string> = {
  [CancelledBy.CLIENT]: "Khách hàng",
  [CancelledBy.WORKER]: "Thợ",
  [CancelledBy.ADMIN]: "Quản trị viên",
  [CancelledBy.SYSTEM]: "Hệ thống",
}

export const disputeReasonLabel: Record<DisputeReason, string> = {
  [DisputeReason.SERVICE_NOT_AS_DESCRIBED]: "Dịch vụ không đúng mô tả",
  [DisputeReason.WORKER_NO_SHOW]: "Thợ không đến",
  [DisputeReason.POOR_QUALITY]: "Chất lượng kém",
  [DisputeReason.INCOMPLETE_SERVICE]: "Dịch vụ không hoàn thành",
  [DisputeReason.UNPROFESSIONAL_BEHAVIOR]: "Thái độ không chuyên nghiệp",
  [DisputeReason.SAFETY_CONCERN]: "Lo ngại về an toàn",
  [DisputeReason.OTHER]: "Khác",
}

export const isBookingExpired = (
  schedule: Booking["schedule"],
  status: BookingStatus,
): boolean => {
  if (status !== BookingStatus.PENDING) return false
  return new Date(schedule.start_time).getTime() < Date.now()
}

export const canCancelBooking = (status: BookingStatus): boolean =>
  status === BookingStatus.PENDING ||
  status === BookingStatus.CONFIRMED ||
  status === BookingStatus.IN_PROGRESS

export const canComplainBooking = (status: BookingStatus): boolean =>
  status === BookingStatus.IN_PROGRESS || status === BookingStatus.COMPLETED

export const getBookingId = (booking: Booking): string =>
  booking.id ?? booking._id

export const getRefId = (
  ref: string | { _id: string } | null | undefined
): string => {
  if (!ref) return ""
  return typeof ref === "string" ? ref : ref._id
}

export const getWorkerName = (worker: Booking["worker_id"]): string => {
  if (!worker) return "-"
  if (typeof worker === "string") return worker
  return worker.full_name || worker.email || "-"
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
