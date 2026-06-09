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
  Search,
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
import { clearSessionCookie } from "@/lib/auth/auth-cookie"
import { isWorkerRoleActive } from "@/lib/auth/roles"
import type { ServiceTab } from "@/lib/home/home-search-params"
import { useLogout, useSwitchRole } from "@/lib/hooks/use-auth"
import { useClickOutside } from "@/lib/hooks/use-click-outside"
import { useSiteSettings } from "@/lib/hooks/use-site-settings"
import {
  getRoleDefaultRoute,
  getRoleRoute,
  type RoleRouteKey,
} from "@/lib/navigation/role-routes"
import {
  useAuthStore,
  useIsSessionLoaded,
  type AuthUser,
} from "@/lib/store/auth-store"
import { useServicesHeaderStore } from "@/lib/store/services-header-store"
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
  activeRole: string | null | undefined
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

const HEADER_SERVICE_TABS: {
  value: ServiceTab
  label: string
  iconSrc: string
}[] = [
  { value: "ASSISTANCE", label: "Trợ lý", iconSrc: "/icons/assistant.png" },
  { value: "COMPANIONSHIP", label: "Đồng hành", iconSrc: "/icons/companion.png" },
]

// Hysteresis thresholds cho services header — tránh oscillation
const EXPAND_THRESHOLD = 40    // expand khi scrollY < ngưỡng này
const COLLAPSE_THRESHOLD = 120 // collapse khi scrollY > ngưỡng này

export function SiteHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isSessionLoaded = useIsSessionLoaded()
  const logoutMutation = useLogout()
  const switchRoleMutation = useSwitchRole()
  const { data: siteSettings } = useSiteSettings()
  const brandName = siteSettings?.name || siteConfig.name
  const brandLogo = siteSettings?.logoUrl
  const menuContainerRef = React.useRef<HTMLDivElement | null>(null)

  const userRoles = user?.roles ?? []
  const lastActiveRole = user?.last_active_role
  const fallbackRole =
    user?.role && (userRoles.length === 0 || userRoles.includes(user.role))
      ? user.role
      : (userRoles[0] ?? user?.role)
  const activeRole = lastActiveRole ?? fallbackRole
  const isWorkerActive = activeRole?.toLowerCase() === "worker"
  const hasWorkerRole = userRoles.some(
    (role) => role.toLowerCase() === "worker"
  )
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

  const [isMounted, setIsMounted] = React.useState(false)
  React.useEffect(() => setIsMounted(true), [])

  const isServicesPage = pathname === "/services"
  const isServicesPageRef = React.useRef(isServicesPage)
  isServicesPageRef.current = isServicesPage

  const {
    activeTab,
    isHeaderExpanded,
    switchTabCallback,
    selectedLocationLabel,
    scheduledAtLabel,
    setHeaderExpanded,
    setFilterSlotEl,
  } = useServicesHeaderStore()
  const showTabNav = isServicesPage && isHeaderExpanded
  const showCompactPill = isServicesPage && !isHeaderExpanded

  // Tab icon click pop animation
  const [poppingTab, setPoppingTab] = React.useState<ServiceTab | null>(null)

  // Manual expand: user clicked compact pill while scrolled → expand in-place
  const [isManuallyExpanded, setIsManuallyExpanded] = React.useState(false)
  const isManuallyExpandedRef = React.useRef(false)
  const servicesHeaderRef = React.useRef<HTMLDivElement>(null)

  const expandHeader = React.useCallback(() => {
    isManuallyExpandedRef.current = true
    isHeaderExpandedRef.current = true
    setIsManuallyExpanded(true)
    setHeaderExpanded(true)
  }, [setHeaderExpanded])

  const collapseManual = React.useCallback(() => {
    isManuallyExpandedRef.current = false
    isHeaderExpandedRef.current = false
    setIsManuallyExpanded(false)
    setHeaderExpanded(false)
  }, [setHeaderExpanded])

  // Click outside services header while manually expanded → collapse
  useClickOutside(
    servicesHeaderRef,
    (event) => {
      // Don't collapse when clicking inside Radix popovers/dialogs (portaled to body)
      const target = event.target as Element | null
      if (target?.closest("[data-radix-popper-content-wrapper]")) return
      if (target?.closest("[data-radix-portal]")) return
      collapseManual()
    },
    isServicesPage && isManuallyExpanded
  )

  // Filter slot ref — portaled into by HomeHero's desktop form
  const filterSlotRef = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => {
    if (!isServicesPage) return
    setFilterSlotEl(filterSlotRef.current)
    return () => setFilterSlotEl(null)
  }, [isServicesPage, setFilterSlotEl])

  // Init header expansion state on services page
  React.useEffect(() => {
    if (isServicesPage) {
      const expanded = window.scrollY < COLLAPSE_THRESHOLD
      isHeaderExpandedRef.current = expanded
      setHeaderExpanded(expanded)
    }
  }, [isServicesPage, setHeaderExpanded, COLLAPSE_THRESHOLD])

  // Ref mirrors isHeaderExpanded để scroll handler không bị stale closure
  const isHeaderExpandedRef = React.useRef(true)

  // Auto-hide header kiểu Instagram: cuộn xuống → ẩn, cuộn lên → hiện.
  // Chỉ áp dụng < md (mobile); desktop header luôn hiện.
  const [hidden, setHidden] = React.useState(false)
  React.useEffect(() => {
    let lastY = window.scrollY
    let ticking = false
    const update = () => {
      const y = window.scrollY
      const diff = y - lastY
      if (y < 64) {
        setHidden(false)
      } else if (Math.abs(diff) > 6) {
        setHidden(diff > 0)
      }
      if (isServicesPageRef.current) {
        if (y < EXPAND_THRESHOLD) {
          // Vùng top: auto-expand, clear manual flag
          if (isManuallyExpandedRef.current) {
            isManuallyExpandedRef.current = false
            setIsManuallyExpanded(false)
          }
          if (!isHeaderExpandedRef.current) {
            isHeaderExpandedRef.current = true
            setHeaderExpanded(true)
          }
        } else if (y > COLLAPSE_THRESHOLD && !isManuallyExpandedRef.current) {
          // Vùng bottom: collapse nếu không manually expanded
          if (isHeaderExpandedRef.current) {
            isHeaderExpandedRef.current = false
            setHeaderExpanded(false)
          }
        }
        // Vùng 40–120px: không làm gì (hysteresis dead zone)
      }
      lastY = y
      ticking = false
    }
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update)
        ticking = true
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [setHeaderExpanded])

  // Đóng menu user khi header bị ẩn để tránh dropdown lơ lửng
  React.useEffect(() => {
    if (hidden) setMenuOpen(false)
  }, [hidden])

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

  // Right-side actions (shared between services and non-services layout)
  const rightActions = (
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
                className={cn(
                  "size-8 rounded-full object-cover",
                  getPlanRingClass(user?.meta_data?.pricing_plan_code)
                )}
              />
            ) : (
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full bg-muted",
                  getPlanRingClass(user?.meta_data?.pricing_plan_code)
                )}
              >
                <User className="size-4" />
              </div>
            )}
          </Button>
          {menuOpen ? (
            <div className="absolute right-0 mt-2 z-50 w-56 rounded-md border bg-background p-1 shadow-lg">
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
      ) : !isSessionLoaded ? (
        <div className="hidden items-center gap-2 md:flex">
          <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
          <div className="h-8 w-16 animate-pulse rounded-md bg-muted" />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLoginClick}
            className="hidden md:inline-flex"
          >
            Đăng nhập
          </Button>
          <Button size="sm" asChild className="hidden md:inline-flex">
            <Link href="/register">Đăng ký</Link>
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/80 pt-safe px-safe backdrop-blur transition-transform duration-300 will-change-transform supports-[backdrop-filter]:bg-background/60",
        hidden && "max-md:-translate-y-full"
      )}
    >
      {isServicesPage ? (
        /* Services page: 2-row expandable header */
        <div ref={servicesHeaderRef}>
          {/* Row 1: Logo | Tab nav ↔ Compact pill | Actions */}
          <div className="container mx-auto grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 md:px-6">
            {/* Left: logo */}
            <Link
              href={homeHref}
              className="flex shrink-0 items-center gap-2 font-semibold justify-self-start"
            >
              {isMounted && brandLogo ? (
                <Image
                  src={brandLogo}
                  alt={brandName}
                  width={120}
                  height={32}
                  priority
                  className="h-8 w-auto object-contain"
                />
              ) : (
                brandName
              )}
            </Link>

            {/* Center: auto column sits between two equal 1fr columns → truly centered */}
            <div className="relative hidden items-center justify-center md:flex">
              {/* Tab navigation */}
              <div
                className={cn(
                  "flex items-center gap-14 transition-all duration-300",
                  showTabNav
                    ? "pointer-events-auto translate-y-0 opacity-100"
                    : "pointer-events-none absolute -translate-y-1 opacity-0"
                )}
              >
                {HEADER_SERVICE_TABS.map((tab, i) => {
                  const isActive = activeTab === tab.value
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => {
                        setPoppingTab(tab.value)
                        switchTabCallback?.(tab.value)
                      }}
                      aria-pressed={isActive}
                      className={cn(
                        "group flex flex-row items-center gap-2 border-b-2 pt-1 pb-2 text-sm font-medium transition-colors",
                        isActive
                          ? "border-foreground text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span
                        className="tab-icon-wrap"
                        data-pop={poppingTab === tab.value ? "true" : undefined}
                        onAnimationEnd={(e) => {
                          if (e.animationName === "tab-icon-pop") setPoppingTab(null)
                        }}
                      >
                        <img
                          src={tab.iconSrc}
                          alt=""
                          aria-hidden="true"
                          className="tab-icon-img size-9 select-none"
                          style={{ "--tab-delay": `${i * 120}ms` } as React.CSSProperties}
                        />
                      </span>
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Compact pill — visible when scrolled, click expands header in-place */}
              <button
                type="button"
                onClick={expandHeader}
                className={cn(
                  "flex items-center gap-2.5 rounded-full border border-border bg-background/95 px-4 py-2 shadow-sm",
                  "text-sm transition-all duration-300",
                  showCompactPill
                    ? "pointer-events-auto scale-100 opacity-100"
                    : "pointer-events-none absolute scale-95 opacity-0"
                )}
              >
                <span className="font-medium text-foreground">
                  {selectedLocationLabel ?? "Địa điểm bất kỳ"}
                </span>
                <span className="h-4 w-px shrink-0 bg-border" />
                <span className="text-muted-foreground">
                  {scheduledAtLabel ?? "Thời gian"}
                </span>
                <span className="h-4 w-px shrink-0 bg-border" />
                <span className="text-muted-foreground">
                  {activeTab === "COMPANIONSHIP" ? "Đồng hành" : "Trợ lý"}
                </span>
                <div className="ml-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Search className="size-3.5" />
                </div>
              </button>
            </div>

            {/* Right: user actions */}
            <div className="flex justify-end">
              {rightActions}
            </div>
          </div>

          {/* Row 2: Filter form slot — portal destination, animated zoom collapse on scroll */}
          <div
            className="hidden overflow-hidden md:block"
            style={{
              maxHeight: isHeaderExpanded ? "96px" : "0px",
              opacity: isHeaderExpanded ? 1 : 0,
              transform: isHeaderExpanded ? "scaleY(1)" : "scaleY(0.75)",
              transformOrigin: "top center",
              transition:
                "max-height 0.4s ease-in-out, opacity 0.35s ease-in-out, transform 0.4s ease-in-out",
              pointerEvents: isHeaderExpanded ? "auto" : "none",
            }}
          >
            <div ref={filterSlotRef} />
          </div>
        </div>
      ) : (
        /* Non-services pages: original two-column layout */
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link
              href={homeHref}
              className="flex items-center gap-2 font-semibold"
            >
              {isMounted && brandLogo ? (
                <Image
                  src={brandLogo}
                  alt={brandName}
                  width={120}
                  height={32}
                  priority
                  className="h-8 w-auto object-contain"
                />
              ) : (
                brandName
              )}
            </Link>
            {!isAuthenticated && (
              <nav className="hidden items-center gap-1 md:flex">
                {PUBLIC_NAV_TABS.map((tab) => (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm transition-colors",
                      pathname === tab.href
                        ? "bg-accent font-medium text-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    )}
                  >
                    {tab.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          {rightActions}
        </div>
      )}
    </header>
  )
}
