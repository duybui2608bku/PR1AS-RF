"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { isAdminUser } from "@/lib/auth/roles"
import { useLogout, useMe } from "@/lib/hooks/use-auth"
import { useAuthStore } from "@/lib/store/auth-store"
import { cn } from "@/lib/utils"

const adminNavItems = [
  {
    href: "/dashboard",
    label: "Tổng quan",
    description: "Số liệu hệ thống",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/users",
    label: "Người dùng",
    description: "Tài khoản và vai trò",
    icon: Users,
  },
  {
    href: "/dashboard/bookings",
    label: "Bookings",
    description: "Thống kê và trạng thái",
    icon: CalendarCheck,
  },
  {
    href: "/dashboard/transactions",
    label: "Giao dịch",
    description: "Nạp tiền và trạng thái",
    icon: CreditCard,
  },
  {
    href: "/dashboard/disputes",
    label: "Tranh chấp",
    description: "Chat xử lý booking",
    icon: MessageSquare,
  },
]

function isActiveRoute(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const token = useAuthStore((state) => state.token)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const meQuery = useMe()
  const hydrated = React.useSyncExternalStore(
    React.useCallback((onStoreChange) => {
      if (useAuthStore.persist.hasHydrated()) return () => undefined
      return useAuthStore.persist.onFinishHydration(onStoreChange)
    }, []),
    () => useAuthStore.persist.hasHydrated(),
    () => true
  )

  const resolvedUser = meQuery.data?.data?.user ?? user
  const isLoading = !hydrated || (Boolean(token) && meQuery.isLoading)

  React.useEffect(() => {
    if (hydrated && (!token || !isAuthenticated)) {
      router.replace("/login")
      return
    }
  }, [hydrated, token, isAuthenticated, router])

  React.useEffect(() => {
    if (meQuery.isSuccess && resolvedUser) {
      if (!isAdminUser(resolvedUser)) {
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

  if (!token || !isAuthenticated) {
    return null
  }

  if (!isAdminUser(resolvedUser) && meQuery.isSuccess) {
    return null
  }

  return <>{children}</>
}

function AdminSidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onNavigate,
  onToggleCollapsed,
}: {
  collapsed: boolean
  mobileOpen: boolean
  onCloseMobile: () => void
  onNavigate: () => void
  onToggleCollapsed: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const logoutMutation = useLogout()
  const user = useAuthStore((state) => state.user)

  const displayName = user?.full_name || user?.name || "Admin"
  const displayEmail = user?.email || "admin@pr1as.local"
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()

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
    <Sidebar
      className={cn(
        "fixed inset-y-0 left-0 z-40 w-full max-w-none shadow-xl transition-[transform,width] duration-200 md:sticky md:w-64 md:translate-x-0 md:shadow-none",
        collapsed && "md:w-20",
        !mobileOpen && "-translate-x-full"
      )}
    >
      <SidebarHeader
        className={cn(
          "gap-3",
          collapsed && "md:h-auto md:flex-col md:justify-center md:px-2 md:py-3"
        )}
      >
        <div className="flex size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <LayoutDashboard className="size-5" />
        </div>
        <div className={cn("min-w-0 flex-1", collapsed && "md:hidden")}>
          <p className="truncate text-sm font-semibold tracking-tight">
            PR1AS Admin
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Quản trị hệ thống
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-auto size-9 rounded-lg md:hidden"
          onClick={onCloseMobile}
          aria-label="Dong menu"
        >
          <X className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "hidden size-8 rounded-lg md:inline-flex",
            collapsed && "md:ml-0"
          )}
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Mo rong sidebar" : "Thu gon sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </Button>
      </SidebarHeader>

      <Separator className="bg-sidebar-border" />

      <SidebarContent>
        <SidebarGroup
          className={cn(
            collapsed && "md:[&_[data-slot=sidebar-group-label]]:hidden"
          )}
        >
          <SidebarGroupLabel>Điều hướng</SidebarGroupLabel>
          {adminNavItems.map((item) => {
            const Icon = item.icon
            const active = isActiveRoute(pathname, item.href)

            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                className={cn(
                  "h-auto w-full justify-start rounded-lg px-3 py-2.5 text-left hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  collapsed && "md:justify-center md:px-0",
                  active &&
                    "bg-sidebar-accent text-sidebar-accent-foreground shadow-xs"
                )}
              >
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  title={item.label}
                  onClick={onNavigate}
                >
                  <Icon className="size-4 shrink-0" />
                  <span
                    className={cn("min-w-0 flex-1", collapsed && "md:hidden")}
                  >
                    <span className="block truncate text-sm font-medium">
                      {item.label}
                    </span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                </Link>
              </Button>
            )
          })}
        </SidebarGroup>
      </SidebarContent>

      <Separator className="bg-sidebar-border" />

      <SidebarFooter
        className={cn("flex flex-col gap-3", collapsed && "md:items-center")}
      >
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg border border-sidebar-border bg-background/60 p-3",
            collapsed &&
              "md:justify-center md:border-0 md:bg-transparent md:p-0"
          )}
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold">
            {initials || "AD"}
          </div>
          <div className={cn("min-w-0 flex-1", collapsed && "md:hidden")}>
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {displayEmail}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn("shrink-0", collapsed && "md:hidden")}
          >
            Admin
          </Badge>
        </div>

        <Button
          variant="ghost"
          className={cn(
            "h-10 w-full justify-start rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed &&
              "md:w-10 md:justify-center md:overflow-hidden md:px-0 md:text-[0px]"
          )}
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          title="Dang xuat"
        >
          {logoutMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
          Đăng xuất
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false)

  return (
    <AdminGuard>
      <div className="flex h-svh overflow-hidden bg-muted/30">
        {mobileSidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/45 md:hidden"
            aria-label="Dong menu"
            onClick={() => setMobileSidebarOpen(false)}
          />
        ) : null}
        <AdminSidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onNavigate={() => setMobileSidebarOpen(false)}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-3 md:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10 rounded-lg"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Mo menu"
            >
              <Menu className="size-5" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">PR1AS Admin</p>
            </div>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto p-3 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  )
}
