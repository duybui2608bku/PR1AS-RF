import { differenceInDays, format, formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"

/**
 * Hiển thị thời gian tương đối ("x giờ trước", "x ngày trước").
 * Nếu đã quá 1 tuần thì chuyển sang ngày giờ chi tiết "HH:mm dd/MM/yyyy".
 */
export function formatRelativeOrDate(input: string | number | Date): string {
  const date =
    typeof input === "string" || typeof input === "number"
      ? new Date(input)
      : input

  if (Number.isNaN(date.getTime())) return ""

  if (differenceInDays(new Date(), date) >= 7) {
    return format(date, "HH:mm dd/MM/yyyy", { locale: vi })
  }

  return formatDistanceToNow(date, { addSuffix: true, locale: vi })
}
