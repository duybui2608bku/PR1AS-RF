import { BookingStatus, type Booking } from "@/types/booking"
import { DEFAULT_LOCALE, pickLocalized } from "@/lib/locale"

export const bookingStatusBadgeClass: Record<BookingStatus, string> = {
  [BookingStatus.PENDING]:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  [BookingStatus.CONFIRMED]:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  [BookingStatus.IN_PROGRESS]:
    "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300",
  [BookingStatus.PENDING_CLIENT_ACCEPTANCE]:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
  [BookingStatus.COMPLETED]:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  [BookingStatus.CANCELLED]: "border-muted bg-muted text-muted-foreground",
  [BookingStatus.REJECTED]:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300",
  [BookingStatus.DISPUTED]:
    "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
  [BookingStatus.EXPIRED]: "border-muted bg-muted text-muted-foreground",
}

export const formatDateTime = (
  value?: string | null,
  localeTag = "vi-VN"
): string => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString(localeTag, {
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

export const getServiceLabel = (
  booking: Booking,
  locale: string = DEFAULT_LOCALE
): string => {
  const service = booking.service_id
  if (!service || typeof service === "string") return booking.service_code
  const name = service.name
  if (typeof name === "string") return name
  if (name && typeof name === "object") {
    return pickLocalized(name, locale) || service.code || booking.service_code
  }
  return service.code || booking.service_code
}
