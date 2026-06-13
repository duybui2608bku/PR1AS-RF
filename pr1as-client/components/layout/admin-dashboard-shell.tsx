"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  BookOpen,
  CalendarCheck,
  CreditCard,
  Gem,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  MessageSquare,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CurrencyOptions } from "@/components/layout/currency-switcher"
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
import { ApiError } from "@/lib/utils/error-handler"
import { useSiteSettings } from "@/lib/hooks/use-site-settings"
import { useAuthStore } from "@/lib/store/auth-store"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/utils/error-handler"

const adminNavGroups = [
  {
    title: "Tổng quan",
    items: [
      {
        href: "/dashboard",
        label: "Tổng quan",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Quản lý dữ liệu",
    items: [
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
        href: "/dashboard/disputes",
        label: "Tranh chấp",
        icon: MessageSquare,
      },
    ],
  },
  {
    title: "Marketing & Phản hồi",
    items: [
      {
        href: "/dashboard/email-campaigns",
        label: "Email Marketing",
        icon: Mail,
      },
      {
        href: "/dashboard/announcements",
        label: "Thông báo",
        icon: Megaphone,
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
    ],
  },
  {
    title: "Cấu hình & Thiết lập",
    items: [
      {
        href: "/dashboard/reputation-config",
        label: "Cấu hình điểm",
        icon: ShieldCheck,
      },
      {
        href: "/dashboard/pricing",
        label: "Pricing",
        icon: Gem,
      },
      {
        href: "/dashboard/settings",
        label: "Cài đặt",
        icon: Settings,
      },
      {
        href: "/dashboard/docs",
        label: "Tài liệu hệ thống",
        icon: BookOpen,
      },
    ],
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
    // Chỉ đá về login khi lỗi auth xác định (401/403) — lỗi network thoáng qua
    // trên mobile không được phép kick admin khỏi dashboard. 401 thật đã được
    // axios interceptor xử lý (refresh hoặc force logout) nên đây chỉ là chốt chặn.
    const status =
      meQuery.error instanceof ApiError ? meQuery.error.statusCode : undefined
    if (meQuery.isError && (status === 401 || status === 403)) {
      router.replace(loginTarget)
    }
  }, [meQuery.isError, meQuery.error, router, loginTarget])

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
  const { data: siteSettings } = useSiteSettings()
  const brandName = siteSettings?.name || "PR1AS"
  const brandLogo = siteSettings?.logoUrl

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
            {brandLogo ? (
              <Image
                src={brandLogo}
                alt={brandName}
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-lg object-contain"
              />
            ) : (
              <div className="flex size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <LayoutDashboard className="size-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">
                {brandName} Admin
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

        <SidebarContent className="space-y-4">
          {adminNavGroups.map((group, groupIdx) => (
            <SidebarGroup key={group.title} className={cn(groupIdx > 0 && "mt-2")}>
              {!collapsed && (
                <SidebarGroupLabel className="px-3 py-1 text-[10px] font-bold tracking-wider text-muted-foreground/50 uppercase select-none">
                  {group.title}
                </SidebarGroupLabel>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = isActiveRoute(pathname, item.href)

                  return (
                    <Button
                      key={item.href}
                      asChild
                      variant="ghost"
                      className={cn(
                        "h-9 w-full justify-start rounded-lg px-3 py-2 text-left hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-150 relative",
                        collapsed && "md:size-9 md:justify-center md:px-0 md:py-0",
                        active && (
                          collapsed
                            ? "bg-primary/[0.06] text-primary font-semibold shadow-xs"
                            : "bg-primary/[0.04] text-primary border-l-2 border-primary rounded-l-none pl-2.5 font-semibold shadow-2xs"
                        )
                      )}
                    >
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        title={collapsed ? item.label : undefined}
                        onClick={onCloseMobile}
                        className="flex items-center w-full"
                      >
                        <Icon className={cn("size-4 shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground")} />
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-sm ml-2.5",
                            collapsed && "md:hidden"
                          )}
                        >
                          {item.label}
                        </span>
                      </Link>
                    </Button>
                  )
                })}
              </div>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <Separator className="bg-sidebar-border" />

        <SidebarFooter className="flex flex-col gap-2.5 p-3">
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl border border-sidebar-border/80 bg-background/40 backdrop-blur-xs p-3 transition-all duration-200 shadow-3xs",
              collapsed && "md:justify-center md:p-2"
            )}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-semibold border border-primary/20 shadow-2xs">
              {initials || "AD"}
            </div>
            <div className={cn("min-w-0 flex-1", collapsed && "md:hidden")}>
              <p className="truncate text-sm font-semibold text-foreground/90">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground/80">
                {displayEmail}
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn("shrink-0 border-primary/20 text-primary bg-primary/5 text-[10px] h-5 px-1.5 font-medium", collapsed && "md:hidden")}
            >
              Admin
            </Badge>
          </div>

          <div className={cn(collapsed && "md:hidden")}>
            <CurrencyOptions label="Tiền tệ hiển thị" dropUp />
          </div>

          <Button
            variant="ghost"
            className={cn(
              "h-9 w-full justify-start rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-all duration-150",
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
            <span className={cn("ml-2.5", collapsed && "md:hidden")}>Đăng xuất</span>
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
  const { data: siteSettings } = useSiteSettings()
  const brandName = siteSettings?.name || "PR1AS"

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
            <span className="truncate text-sm font-semibold">{brandName} Admin</span>
          </div>
          <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  )
}
