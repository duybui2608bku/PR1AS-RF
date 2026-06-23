import { differenceInDays, format, formatDistanceToNow, type Locale } from "date-fns"
import { enUS, ko, vi, zhCN } from "date-fns/locale"

const DATE_FNS_LOCALES: Record<string, Locale> = {
  vi,
  en: enUS,
  zh: zhCN,
  ko,
}

/**
 * Hiển thị thời gian tương đối ("x giờ trước", "x ngày trước").
 * Nếu đã quá 1 tuần thì chuyển sang ngày giờ chi tiết "HH:mm dd/MM/yyyy".
 */
export function formatRelativeOrDate(
  input: string | number | Date,
  locale: string = "vi"
): string {
  const date =
    typeof input === "string" || typeof input === "number"
      ? new Date(input)
      : input

  if (Number.isNaN(date.getTime())) return ""
  const dateLocale = DATE_FNS_LOCALES[locale] ?? vi

  if (differenceInDays(new Date(), date) >= 7) {
    return format(date, "HH:mm dd/MM/yyyy", { locale: dateLocale })
  }

  return formatDistanceToNow(date, { addSuffix: true, locale: dateLocale })
}
