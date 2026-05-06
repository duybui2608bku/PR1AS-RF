"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CreditCard,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageSquare,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { useAuthStore } from "@/lib/store/auth-store"
import { useMe, useLogout } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"

function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const token = useAuthStore((s) => s.token)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const meQuery = useMe()

  const resolvedUser = meQuery.data?.data?.user ?? user
  const isLoading = Boolean(token) && meQuery.isLoading

  React.useEffect(() => {
    if (!token || !isAuthenticated) {
      router.replace("/login")
      return
    }
  }, [token, isAuthenticated, router])

  React.useEffect(() => {
    if (meQuery.isSuccess && resolvedUser) {
      const roles = resolvedUser.roles ?? []
      const isAdmin = roles.includes("admin") || resolvedUser.role === "admin"
      if (!isAdmin) {
        toast.error("Bạn không có quyền truy cập trang quản trị.")
        router.replace("/")
      }
    }
  }, [meQuery.isSuccess, resolvedUser, router])

  React.useEffect(() => {
    if (meQuery.isError) {
      router.replace("/login")
    }
  }, [meQuery.isError, router])

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const roles = resolvedUser?.roles ?? []
  const isAdmin = roles.includes("admin") || resolvedUser?.role === "admin"

  if (!isAdmin && meQuery.isSuccess) {
    return null
  }

  return <>{children}</>
}

function AdminSidebar() {
  const router = useRouter()
  const logoutMutation = useLogout()

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
      toast.success("Đăng xuất thành công.")
      router.replace("/login")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể đăng xuất."
      toast.error(message)
    }
  }

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-background">
      <div className="flex items-center gap-2 border-b px-5 py-4">
        <LayoutDashboard className="size-5 text-primary" />
        <span className="font-semibold tracking-tight">Admin Panel</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <LayoutDashboard className="size-4" />
          Tổng quan
        </Link>
        <Link
          href="/dashboard/users"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <Users className="size-4" />
          Quản lý người dùng
        </Link>
        <Link
          href="/dashboard/transactions"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <CreditCard className="size-4" />
          Giao dịch nạp tiền
        </Link>
        <Link
          href="/dashboard/disputes"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <MessageSquare className="size-4" />
          Chat tranh chấp
        </Link>
      </nav>

      <div className="border-t p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          {logoutMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
          Đăng xuất
        </Button>
      </div>
    </aside>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminGuard>
      <div className="flex min-h-svh bg-muted/30">
        <AdminSidebar />
        <div className="flex flex-1 flex-col overflow-auto">
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </AdminGuard>
  )
}
