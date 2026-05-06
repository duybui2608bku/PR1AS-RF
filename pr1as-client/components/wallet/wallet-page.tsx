"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCw,
  Wallet,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  useDepositTransactions,
  useWalletBalance,
} from "@/lib/hooks/use-wallet"
import { useAuthStore } from "@/lib/store/auth-store"
import { cn } from "@/lib/utils"
import {
  formatVnd,
  formatWalletDate,
  statusClassName,
  statusLabel,
} from "@/components/wallet/wallet-format"

const PAGE_SIZE = 10

export function WalletPage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [page, setPage] = useState(1)

  const balanceQuery = useWalletBalance()
  const depositsQuery = useDepositTransactions({ page, limit: PAGE_SIZE })

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, router])

  const transactions = useMemo(
    () => depositsQuery.data?.data ?? [],
    [depositsQuery.data?.data]
  )
  const pagination = depositsQuery.data?.pagination
  const totalPages = pagination?.totalPages ?? 0
  const canGoBack = page > 1
  const canGoNext = totalPages ? page < totalPages : false
  const isLoading = balanceQuery.isLoading || depositsQuery.isLoading

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
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ví của tôi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Số dư và giao dịch nạp tiền
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={balanceQuery.isFetching || depositsQuery.isFetching}
          >
            {balanceQuery.isFetching || depositsQuery.isFetching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </Button>
          <Button asChild>
            <Link href="/client/wallet/deposit">
              <Plus className="size-4" />
              Nạp tiền
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
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

      <Card className="mt-5">
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
                <Link href="/client/wallet/deposit">Nạp tiền</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
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
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                            statusClassName[transaction.status]
                          )}
                        >
                          {statusLabel[transaction.status]}
                        </span>
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
                            <Link href="/client/wallet/deposit">
                              <ArrowRight className="size-4" />
                            </Link>
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
