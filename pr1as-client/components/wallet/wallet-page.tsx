"use client"

import Link from "next/link"
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  Ban,
  ChevronRight,
  Clock3,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCw,
  Wallet,
  XCircle,
} from "lucide-react"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table } from "@/components/ui/table"
import {
  useDepositTransactions,
  useWalletBalance,
} from "@/lib/hooks/use-wallet"
import { cn } from "@/lib/utils"
import {
  formatVnd,
  formatWalletDate,
  statusClassName,
  statusLabel,
} from "@/components/wallet/wallet-format"
import type { WalletTransaction } from "@/services/wallet.service"

const PAGE_SIZE = 10

// iOS-style: vòng tròn icon + màu theo trạng thái giao dịch
const statusVisual: Record<
  WalletTransaction["status"],
  { icon: React.ComponentType<{ className?: string }>; circle: string }
> = {
  pending: {
    icon: Clock3,
    circle:
      "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
  },
  success: {
    icon: ArrowDownLeft,
    circle:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  failed: {
    icon: XCircle,
    circle: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
  },
  cancelled: {
    icon: Ban,
    circle: "bg-muted text-muted-foreground",
  },
}

function TransactionStatusBadge({
  status,
}: {
  status: WalletTransaction["status"]
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
        statusClassName[status]
      )}
    >
      {statusLabel[status]}
    </span>
  )
}

// Hàng giao dịch kiểu danh sách iOS (mobile)
function MobileTransactionRow({
  transaction,
  isLast,
}: {
  transaction: WalletTransaction
  isLast: boolean
}) {
  const visual = statusVisual[transaction.status]
  const Icon = visual.icon
  const isPending = transaction.status === "pending"

  const inner = (
    <>
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          visual.circle
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium">
          {transaction.payment_code ?? transaction.id}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {formatWalletDate(transaction.created_at)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-[15px] font-semibold">
          {formatVnd(transaction.amount)}
        </span>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[11px] font-medium",
            statusClassName[transaction.status]
          )}
        >
          {statusLabel[transaction.status]}
        </span>
      </div>
      {isPending ? (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      ) : null}
    </>
  )

  const rowClass = cn(
    "flex items-center gap-3 px-4 py-3.5",
    !isLast && "border-b"
  )

  if (isPending) {
    return (
      <Link
        href="/wallet/deposit"
        className={cn(
          rowClass,
          "transition-colors hover:bg-accent active:bg-accent/70"
        )}
      >
        {inner}
      </Link>
    )
  }

  return <div className={rowClass}>{inner}</div>
}

export function WalletPage() {
  const [page, setPage] = useState(1)

  const balanceQuery = useWalletBalance()
  const depositsQuery = useDepositTransactions({ page, limit: PAGE_SIZE })

  const transactions = useMemo(
    () => depositsQuery.data?.data ?? [],
    [depositsQuery.data?.data]
  )
  const pagination = depositsQuery.data?.pagination
  const totalPages = pagination?.totalPages ?? 0
  const canGoBack = page > 1
  const canGoNext = totalPages ? page < totalPages : false
  const isLoading = balanceQuery.isLoading || depositsQuery.isLoading
  const isRefreshing = balanceQuery.isFetching || depositsQuery.isFetching

  const totalDeposited = useMemo(
    () =>
      transactions.reduce((sum, transaction) => {
        if (transaction.status !== "success") return sum
        return sum + transaction.amount
      }, 0),
    [transactions]
  )

  const handleRefresh = () => {
    balanceQuery.refetch()
    depositsQuery.refetch()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 md:py-8">
      <div className="mb-5 flex items-start justify-between gap-4 md:mb-6 md:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Ví của tôi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Số dư và giao dịch nạp tiền
          </p>
        </div>

        {/* Desktop: nút làm mới + nạp tiền */}
        <div className="hidden flex-wrap gap-2 md:flex">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </Button>
          <Button asChild>
            <Link href="/wallet/deposit">
              <Plus className="size-4" />
              Nạp tiền
            </Link>
          </Button>
        </div>

        {/* Mobile: nút làm mới tròn */}
        <button
          type="button"
          aria-label="Làm mới"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-card text-foreground transition-colors active:scale-95 disabled:opacity-60 md:hidden"
        >
          {isRefreshing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
        </button>
      </div>

      <div
        role="note"
        className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
      >
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold">
            Chỉ nạp đủ tiền cho gói cước bạn dự định mua
          </p>
          <p className="text-xs">
            Hệ thống <strong>chưa hỗ trợ rút tiền</strong>. Số dư chỉ dùng để
            thanh toán gói cước và dịch vụ trong nền tảng.
          </p>
        </div>
      </div>

      {/* Mobile: thẻ số dư nổi bật + tổng nạp (iOS) */}
      <div className="space-y-4 md:hidden">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary-foreground/15">
              <Wallet className="size-5" />
            </span>
            <span className="text-sm font-medium text-primary-foreground/80">
              Số dư khả dụng
            </span>
          </div>
          <div className="mt-4 text-4xl font-bold tracking-tight">
            {formatVnd(balanceQuery.data?.balance ?? 0)}
          </div>
          <p className="mt-1 text-xs text-primary-foreground/70">
            VND · ID {balanceQuery.data?.user_id || "-"}
          </p>
          <Link
            href="/wallet/deposit"
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-foreground text-[15px] font-semibold text-primary shadow-sm transition-colors hover:bg-primary-foreground/90 active:scale-[0.99]"
          >
            <Plus className="size-4" />
            Nạp tiền
          </Link>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 shadow-sm">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground">
            <ReceiptText className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Tổng nạp thành công</p>
            <p className="text-lg font-semibold">{formatVnd(totalDeposited)}</p>
          </div>
          <span className="shrink-0 text-sm text-muted-foreground">
            {transactions.length} GD
          </span>
        </div>
      </div>

      {/* Desktop: lưới số dư + tổng nạp */}
      <div className="hidden gap-4 md:grid md:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="size-5" />
              Số dư
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-4xl font-bold tracking-tight">
              {formatVnd(balanceQuery.data?.balance ?? 0)}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span className="rounded-md border px-3 py-1">VND</span>
              <span className="rounded-md border px-3 py-1">
                User ID: {balanceQuery.data?.user_id || "-"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="size-5" />
              Tổng nạp
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-2xl font-semibold">
              {formatVnd(totalDeposited)}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {transactions.length} giao dịch
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mobile: lịch sử nạp tiền (danh sách iOS) */}
      <div className="mt-6 md:hidden">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Lịch sử nạp tiền
          </h2>
          <span className="text-xs text-muted-foreground">
            {pagination?.total ?? 0} giao dịch
          </span>
        </div>
        {transactions.length === 0 ? (
          <div className="flex min-h-44 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card px-4 text-center">
            <ReceiptText className="size-9 text-muted-foreground" />
            <p className="text-sm font-medium">Chưa có giao dịch nạp tiền</p>
            <Button asChild size="sm">
              <Link href="/wallet/deposit">Nạp tiền</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            {transactions.map((transaction, index) => (
              <MobileTransactionRow
                key={transaction.id}
                transaction={transaction}
                isLast={index === transactions.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: bảng lịch sử nạp tiền */}
      <Card className="mt-5 hidden md:block">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-muted/30">
          <CardTitle className="text-base">Lịch sử nạp tiền</CardTitle>
          <Badge variant="outline">{pagination?.total ?? 0}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-4 text-center">
              <ReceiptText className="size-9 text-muted-foreground" />
              <p className="text-sm font-medium">Chưa có giao dịch nạp tiền</p>
              <Button asChild size="sm">
                <Link href="/wallet/deposit">Nạp tiền</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Mã nạp</th>
                    <th className="px-4 py-3 font-medium">Số tiền</th>
                    <th className="px-4 py-3 font-medium">Trạng thái</th>
                    <th className="px-4 py-3 font-medium">Cổng</th>
                    <th className="px-4 py-3 font-medium">Thời gian</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b last:border-b-0"
                    >
                      <td className="max-w-[220px] px-4 py-3">
                        <div className="truncate font-medium">
                          {transaction.payment_code ?? transaction.id}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {transaction.sepay_reference_code ??
                            transaction.gateway_transaction_id ??
                            "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {formatVnd(transaction.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <TransactionStatusBadge status={transaction.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground uppercase">
                        {transaction.gateway ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatWalletDate(transaction.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {transaction.status === "pending" ? (
                          <Button asChild variant="ghost" size="sm">
                            <Link href="/wallet/deposit">
                              <ArrowRight className="size-4" />
                            </Link>
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {transactions.length > 0 ? (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={!canGoBack}
          >
            Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            {page}/{Math.max(totalPages, 1)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((value) => value + 1)}
            disabled={!canGoNext}
          >
            Sau
          </Button>
        </div>
      ) : null}
    </div>
  )
}
