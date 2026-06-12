import type { WalletTransactionStatus } from "@/services/wallet.service"

export const formatVnd = (
  amount: number,
  localeTag: string = "vi-VN"
): string =>
  new Intl.NumberFormat(localeTag, {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount)

export const formatWalletDate = (
  value?: string | null,
  localeTag: string = "vi-VN"
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

/** Translation keys (namespace "Wallet") for each transaction status. */
export const statusKeys: Record<WalletTransactionStatus, string> = {
  pending: "statusPending",
  success: "statusSuccess",
  failed: "statusFailed",
  cancelled: "statusCancelled",
}

export const statusClassName: Record<WalletTransactionStatus, string> = {
  pending:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  failed:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300",
  cancelled: "border-muted bg-muted text-muted-foreground",
}
