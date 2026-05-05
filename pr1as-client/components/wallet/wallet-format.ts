import type { WalletTransactionStatus } from "@/services/wallet.service"

export const formatVnd = (amount: number): string =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount)

export const formatWalletDate = (value?: string | null): string => {
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

export const statusLabel: Record<WalletTransactionStatus, string> = {
  pending: "Chờ thanh toán",
  success: "Thành công",
  failed: "Thất bại",
  cancelled: "Đã hủy",
}

export const statusClassName: Record<WalletTransactionStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  cancelled: "border-muted bg-muted text-muted-foreground",
}
