"use client"

import {
  CalendarCheck2,
  CalendarDays,
  Crown,
  FileText,
  Heart,
  Loader2,
  LogOut,
  MessageCircle,
  Settings,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { NotificationBell } from "@/components/layout/notification-bell"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { ErrorBoundary } from "@/components/providers/error-boundary"
import { Button } from "@/components/ui/button"
import { siteConfig } from "@/config/site"
import { isWorkerRoleActive } from "@/lib/auth/roles"
import { clearSessionCookie } from "@/lib/auth/auth-cookie"
import { useLogout, useSwitchRole } from "@/lib/hooks/use-auth"
import { useClickOutside } from "@/lib/hooks/use-click-outside"
import { getRoleDefaultRoute, getRoleRoute, type RoleRouteKey } from "@/lib/navigation/role-routes"
import { useAuthStore, type AuthUser } from "@/lib/store/auth-store"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/utils/error-handler"
import { getPlanRingClass } from "@/lib/utils/plan"

type UserMenuItem = {
  routeKey: RoleRouteKey
  href: string
  label: string
  icon: LucideIcon
  roles?: readonly string[]
}

const USER_MENU_ITEMS: readonly UserMenuItem[] = [
  { routeKey: "chat", href: "/chat", label: "Chat", icon: MessageCircle },
  { routeKey: "posts", href: "/posts", label: "Posts", icon: FileText },
  {
    routeKey: "favorites",
    href: "/client/favorites",
    label: "Yêu thích",
    icon: Heart,
    roles: ["client"],
  },
  { routeKey: "profile", href: "/client/profile", label: "Hồ sơ", icon: User },
  { routeKey: "settings", href: "/settings", label: "Cài đặt", icon: Settings },
  {
    routeKey: "schedule",
    href: "/worker/bookings/schedule",
    label: "Schedule",
    icon: CalendarDays,
    roles: ["worker"],
  },
  { routeKey: "wallet", href: "/wallet", label: "Ví", icon: Wallet },
  {
    routeKey: "booking",
    href: "/booking",
    label: "Booking",
    icon: CalendarCheck2,
  },
]

const resolveMenuHref = (
  routeKey: RoleRouteKey,
  fallbackHref: string,
  user: AuthUser | null | undefined,
  activeRole: string | null | undefined,
) => {
  if (routeKey === "profile" && isWorkerRoleActive(user) && user?.id) {
    return `/worker/${user.id}`
  }

  return getRoleRoute(routeKey, activeRole, fallbackHref)
}

const formatPricingPlan = (planCode: string | null | undefined) =>
  (planCode?.trim() || "standard").replace(/[-_]+/g, " ").toUpperCase()

const PUBLIC_NAV_TABS = [
  { href: "/services", label: "Dịch vụ" },
  { href: "/posts", label: "Bài viết" },
] as const

export function SiteHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logoutMutation = useLogout()
  const switchRoleMutation = useSwitchRole()
  const menuContainerRef = React.useRef<HTMLDivElement | null>(null)

  const userRoles = user?.roles ?? []
  const lastActiveRole = user?.last_active_role
  const fallbackRole =
    user?.role && (userRoles.length === 0 || userRoles.includes(user.role))
      ? user.role
      : (userRoles[0] ?? user?.role)
  const activeRole = lastActiveRole ?? fallbackRole
  const isWorkerActive = activeRole?.toLowerCase() === "worker"
  const hasWorkerRole = userRoles.some((role) => role.toLowerCase() === "worker")
  const homeHref = getRoleDefaultRoute(activeRole)

  const switchRoleLabel = isWorkerActive ? "CLIENT" : "WORKER"
  const userMenuItems = React.useMemo(
    () => [
      ...USER_MENU_ITEMS.filter((item) => {
        if (!item.roles) return true

        return activeRole
          ? item.roles.includes(activeRole.toLowerCase())
          : false
      }).map((item) => ({
        ...item,
        href: resolveMenuHref(item.routeKey, item.href, user, activeRole),
      })),
      {
        routeKey: "pricing" as const,
        href: "/pricing",
        label: `${formatPricingPlan(user?.meta_data?.pricing_plan_code)}`,
        icon: Crown,
      },
    ],
    [activeRole, user]
  )

  useClickOutside(menuContainerRef, () => setMenuOpen(false), menuOpen)

  const handleSwitchRole = async () => {
    if (!isAuthenticated) {
      toast.info("Vui lòng đăng nhập để chuyển role.")
      router.push("/login")
      return
    }

    try {
      const nextRole = isWorkerActive ? "client" : "worker"

      if (nextRole === "worker" && !hasWorkerRole) {
        toast.info("Hoàn tất hồ sơ worker để bắt đầu nhận việc.")
        setMenuOpen(false)
        router.push("/worker/setup")
        return
      }

      await switchRoleMutation.mutateAsync({ last_active_role: nextRole })
      toast.success("Chuyển trạng thái tài khoản thành công.")
      router.replace(getRoleDefaultRoute(nextRole))
      router.refresh()
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể đổi role."))
    }
  }

  const handleLoginClick = async () => {
    try {
      await clearSessionCookie()
    } catch {
      // ignore — proceed to login even if cookie clear fails
    }
    router.push("/login")
  }

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
      setMenuOpen(false)
      toast.success("Đăng xuất thành công.")
      router.replace("/login")
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể đăng xuất."))
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href={homeHref} className="font-semibold">
            {siteConfig.name}
          </Link>
          {!isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1">
              {PUBLIC_NAV_TABS.map((tab) => (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    pathname === tab.href
                      ? "bg-accent font-medium text-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSwitchRole}
              disabled={switchRoleMutation.isPending}
            >
              {switchRoleMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              <span>{switchRoleLabel}</span>
            </Button>
          ) : null}
          <ThemeToggle />
          {isAuthenticated ? (
            <ErrorBoundary fallback={null}>
              <NotificationBell />
            </ErrorBoundary>
          ) : null}
          {isAuthenticated ? (
            <div ref={menuContainerRef} className="relative hidden md:block">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Mở menu người dùng"
                onClick={() => setMenuOpen((value) => !value)}
              >
                {user?.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.email ?? "User avatar"}
                    width={32}
                    height={32}
                    className={cn("size-8 rounded-full object-cover", getPlanRingClass(user?.meta_data?.pricing_plan_code))}
                  />
                ) : (
                  <div className={cn("flex size-8 items-center justify-center rounded-full bg-muted", getPlanRingClass(user?.meta_data?.pricing_plan_code))}>
                    <User className="size-4" />
                  </div>
                )}
              </Button>
              {menuOpen ? (
                <div className="absolute right-0 mt-2 w-56 rounded-md border bg-background p-1 shadow-lg">
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    {user?.email ?? "Khách"}
                  </div>
                  {userMenuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
                      onClick={() => setMenuOpen(false)}
                    >
                      <item.icon className="size-4" />
                      {item.label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-accent dark:text-red-400"
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <LogOut className="size-4" />
                    )}
                    Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleLoginClick}>
                Đăng nhập
              </Button>
              <Button size="sm" asChild className="hidden md:inline-flex">
                <Link href="/register">Đăng ký</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

