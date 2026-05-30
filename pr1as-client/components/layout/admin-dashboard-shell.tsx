"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  CalendarCheck,
  CreditCard,
  Gem,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldAlert,
  ShieldCheck,
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
import { getErrorMessage } from "@/lib/utils/error-handler"

const adminNavItems = [
  {
    href: "/dashboard",
    label: "Tổng quan",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/users",
    label: "Người dùng",
    icon: Users,
  },
  {
    href: "/dashboard/bookings",
    label: "Bookings",
    icon: CalendarCheck,
  },
  {
    href: "/dashboard/transactions",
    label: "Giao dịch",
    icon: CreditCard,
  },
  {
    href: "/dashboard/pricing",
    label: "Pricing",
    icon: Gem,
  },
  {
    href: "/dashboard/disputes",
    label: "Tranh chấp",
    icon: MessageSquare,
  },
  {
    href: "/dashboard/reports",
    label: "Báo cáo",
    icon: ShieldAlert,
  },
  {
    href: "/dashboard/feedback",
    label: "Phản hồi",
    icon: MessagesSquare,
  },
  {
    href: "/dashboard/reputation-config",
    label: "Cấu hình điểm",
    icon: ShieldCheck,
  },
]

function isActiveRoute(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
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
  const isLoading = !hydrated || (isAuthenticated && meQuery.isLoading)

  const loginTarget = React.useMemo(
    () => (pathname ? `/login?from=${encodeURIComponent(pathname)}` : "/login"),
    [pathname]
  )

  React.useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace(loginTarget)
      return
    }
  }, [hydrated, isAuthenticated, router, loginTarget])

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
      router.replace(loginTarget)
    }
  }, [meQuery.isError, router, loginTarget])

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (!isAdminUser(resolvedUser) && meQuery.isSuccess) {
    return null
  }

  return <>{children}</>
}

type AdminSidebarProps = {
  collapsed: boolean
  mobileOpen: boolean
  onCloseMobile: () => void
  onToggleCollapsed: () => void
}

function AdminSidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapsed,
}: AdminSidebarProps) {
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
      toast.error(getErrorMessage(error, "Không thể đăng xuất."))
    }
  }

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-label="Đóng menu quản trị"
          onClick={onCloseMobile}
        />
      ) : null}
      <Sidebar
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-[width,transform] duration-200 md:sticky md:top-0 md:z-auto md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "md:w-16" : "md:w-64"
        )}
      >
        <SidebarHeader
          className={cn(
            "justify-between gap-3",
            collapsed && "md:justify-center md:px-3"
          )}
        >
          <div
            className={cn(
              "flex min-w-0 items-center gap-3",
              collapsed && "md:hidden"
            )}
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <LayoutDashboard className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">
                PR1AS Admin
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Quản trị hệ thống
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 md:hidden"
            onClick={onCloseMobile}
            aria-label="Đóng menu quản trị"
            title="Đóng menu"
          >
            <X className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden size-8 md:inline-flex"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
            title={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
        </SidebarHeader>

        <Separator className="bg-sidebar-border" />

        <SidebarContent>
          <SidebarGroup>
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
                    collapsed && "md:size-10 md:justify-center md:px-0 md:py-0",
                    active &&
                      "bg-sidebar-accent text-sidebar-accent-foreground shadow-xs"
                  )}
                >
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                    onClick={onCloseMobile}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-sm font-medium",
                        collapsed && "md:hidden"
                      )}
                    >
                      {item.label}
                    </span>
                  </Link>
                </Button>
              )
            })}
          </SidebarGroup>
        </SidebarContent>

        <Separator className="bg-sidebar-border" />

        <SidebarFooter className="flex flex-col gap-3">
          <div
            className={cn(
              "flex items-center gap-3 rounded-lg border border-sidebar-border bg-background/60 p-3",
              collapsed && "md:justify-center md:p-2"
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
              collapsed && "md:justify-center md:px-0"
            )}
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            title="Đăng xuất"
          >
            {logoutMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            <span className={cn(collapsed && "md:hidden")}>Đăng xuất</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
    </>
  )
}

export function AdminDashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false)

  return (
    <AdminGuard>
      <div className="flex h-svh overflow-hidden bg-muted/30">
        <AdminSidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 md:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Mở menu quản trị"
              title="Mở menu"
            >
              <Menu className="size-5" />
            </Button>
            <span className="truncate text-sm font-semibold">PR1AS Admin</span>
          </div>
          <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  )
}
