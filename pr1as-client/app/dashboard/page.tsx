"use client"

import Link from "next/link"
import { CreditCard, MessageSquare, Users } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useGetUsers } from "@/lib/hooks/use-users"
import { useAdminTransactionStats } from "@/lib/hooks/use-admin-transactions"

export default function DashboardPage() {
  const usersQuery = useGetUsers({ limit: 1 })
  const statsQuery = useAdminTransactionStats()

  const totalUsers = usersQuery.data?.pagination?.total ?? "—"
  const totalTxAmount = statsQuery.data?.successAmount
  const pendingCount = statsQuery.data?.pendingCount ?? "—"

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tổng quan</h1>
        <p className="text-sm text-muted-foreground">Chào mừng đến trang quản trị hệ thống.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/dashboard/users">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Người dùng</CardTitle>
              <Users className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalUsers}</div>
              <CardDescription className="mt-1">Tổng số tài khoản đã đăng ký</CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/transactions">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng nạp tiền</CardTitle>
              <CreditCard className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {totalTxAmount !== undefined ? formatCurrency(totalTxAmount) : "—"}
              </div>
              <CardDescription className="mt-1">
                {pendingCount} giao dịch đang chờ xử lý
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/disputes">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chat tranh chấp</CardTitle>
              <MessageSquare className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">—</div>
              <CardDescription className="mt-1">Các cuộc hội thoại tranh chấp</CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
