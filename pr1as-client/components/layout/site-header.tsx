"use client"

import {
  Bell,
  CalendarCheck2,
  Crown,
  FileText,
  Heart,
  Loader2,
  LogOut,
  Menu,
  MessageCircle,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { NotificationBell } from "@/components/layout/notification-bell"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { Button } from "@/components/ui/button"
import { siteConfig } from "@/config/site"
import { isWorkerRoleActive } from "@/lib/auth/roles"
import { useLogout, useSwitchRole } from "@/lib/hooks/use-auth"
import { useClickOutside } from "@/lib/hooks/use-click-outside"
import { getRoleDefaultRoute, getRoleRoute, type RoleRouteKey } from "@/lib/navigation/role-routes"
import { useAuthStore, type AuthUser } from "@/lib/store/auth-store"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/utils/error-handler"
import { getPlanRingClass } from "@/lib/utils/plan"

const USER_MENU_ITEMS = [
  { routeKey: "chat", href: "/chat", label: "Chat", icon: MessageCircle },
  { routeKey: "posts", href: "/posts", label: "Posts", icon: FileText },
  {
    routeKey: "favorites",
    href: "/client/favorites",
    label: "Yeu thich",
    icon: Heart,
  },
  { routeKey: "profile", href: "/client/profile", label: "Hồ sơ", icon: User },
  {
    routeKey: "notifications",
    href: "/notifications",
    label: "Thông báo",
    icon: Bell,
  },
  { routeKey: "wallet", href: "/wallet", label: "Ví", icon: Wallet },
  {
    routeKey: "booking",
    href: "/booking",
    label: "Booking",
    icon: CalendarCheck2,
  },
] as const satisfies ReadonlyArray<{
  routeKey: RoleRouteKey
  href: string
  label: string
  icon: LucideIcon
}>

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

export function SiteHeader() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
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
      ...USER_MENU_ITEMS.map((item) => ({
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
        setOpen(false)
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

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
      setMenuOpen(false)
      setOpen(false)
      toast.success("Đăng xuất thành công.")
      router.replace("/login")
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể đăng xuất."))
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center">
          <Link href={homeHref} className="font-semibold">
            {siteConfig.name}
          </Link>
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
          {isAuthenticated ? <NotificationBell /> : null}
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
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-accent"
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
            <div className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Đăng nhập</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Đăng ký</Link>
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
          >
            <Menu className="size-4" />
          </Button>
        </div>
      </div>

      {open ? (
        <nav className="border-t md:hidden">
          <div className="container mx-auto flex flex-col gap-1 px-4 py-2">
            {isAuthenticated ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="mb-2 justify-start"
                  onClick={handleSwitchRole}
                  disabled={switchRoleMutation.isPending}
                >
                  {switchRoleMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  {switchRoleLabel}
                </Button>
                <div className="border-t pt-2">
                  {userMenuItems.map((item) => (
                    <button
                      key={item.href}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        setOpen(false)
                        router.push(item.href)
                      }}
                    >
                      <item.icon className="size-4" />
                      {item.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-red-600 hover:bg-accent"
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
              </>
            ) : (
              <div className="flex flex-col gap-2 py-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setOpen(false)
                    router.push("/login")
                  }}
                >
                  Đăng nhập
                </Button>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setOpen(false)
                    router.push("/register")
                  }}
                >
                  Đăng ký
                </Button>
              </div>
            )}
          </div>
        </nav>
      ) : null}
    </header>
  )
}

