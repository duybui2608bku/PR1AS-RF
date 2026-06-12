"use client"

import {
  Briefcase,
  CalendarCheck2,
  CalendarDays,
  Crown,
  FileText,
  Heart,
  HeartHandshake,
  Loader2,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import { LocaleSwitcher } from "@/components/layout/locale-switcher"
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
import { useUIStore } from "@/lib/store/ui-store"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/utils/error-handler"
import { getPlanRingClass } from "@/lib/utils/plan"

type UserMenuItemDef = {
  routeKey: RoleRouteKey
  href: string
  labelKey: string
  icon: LucideIcon
  roles?: readonly string[]
}

const USER_MENU_ITEM_DEFS: readonly UserMenuItemDef[] = [
  { routeKey: "chat", href: "/chat", labelKey: "chat", icon: MessageCircle },
  { routeKey: "posts", href: "/posts", labelKey: "posts", icon: FileText },
  {
    routeKey: "favorites",
    href: "/client/favorites",
    labelKey: "favorites",
    icon: Heart,
    roles: ["client"],
  },
  {
    routeKey: "profile",
    href: "/client/profile",
    labelKey: "profile",
    icon: User,
  },
  {
    routeKey: "settings",
    href: "/settings",
    labelKey: "settings",
    icon: Settings,
  },
  {
    routeKey: "schedule",
    href: "/worker/bookings/schedule",
    labelKey: "schedule",
    icon: CalendarDays,
    roles: ["worker"],
  },
  { routeKey: "wallet", href: "/wallet", labelKey: "wallet", icon: Wallet },
  {
    routeKey: "booking",
    href: "/booking",
    labelKey: "booking",
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

const EXPAND_THRESHOLD = 40
const COLLAPSE_THRESHOLD = 120

export function SiteHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations("Nav")
  const tToast = useTranslations("Toast")
  const tServices = useTranslations("Services")
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

  const switchRoleLabel = isWorkerActive
    ? t("switchToClient")
    : t("switchToWorker")
  const userMenuItems = React.useMemo(
    () => [
      ...USER_MENU_ITEM_DEFS.filter((item) => {
        if (!item.roles) return true

        return activeRole
          ? item.roles.includes(activeRole.toLowerCase())
          : false
      }).map((item) => ({
        ...item,
        label: t(item.labelKey as Parameters<typeof t>[0]),
        href: resolveMenuHref(item.routeKey, item.href, user, activeRole),
      })),
      {
        routeKey: "pricing" as const,
        href: "/pricing",
        label: `${formatPricingPlan(user?.meta_data?.pricing_plan_code)}`,
        icon: Crown,
      },
    ],
    [t, activeRole, user]
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

  const HEADER_SERVICE_TABS: {
    value: ServiceTab
    label: string
    icon: LucideIcon
  }[] = [
    { value: "ASSISTANCE", label: tServices("assistance"), icon: Briefcase },
    {
      value: "COMPANIONSHIP",
      label: tServices("companionship"),
      icon: HeartHandshake,
    },
  ]

  const tabWrapRefs = React.useRef<(HTMLSpanElement | null)[]>([])
  const triggerTabPop = (index: number) => {
    const el = tabWrapRefs.current[index]
    if (!el) return
    el.classList.remove("popping")
    void el.offsetWidth
    el.classList.add("popping")
    el.addEventListener("animationend", () => el.classList.remove("popping"), {
      once: true,
    })
  }

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

  useClickOutside(
    servicesHeaderRef,
    (event) => {
      const target = event.target as Element | null
      if (target?.closest("[data-radix-popper-content-wrapper]")) return
      if (target?.closest("[data-radix-portal]")) return
      collapseManual()
    },
    isServicesPage && isManuallyExpanded
  )

  const filterSlotRef = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => {
    if (!isServicesPage) return
    setFilterSlotEl(filterSlotRef.current)
    return () => setFilterSlotEl(null)
  }, [isServicesPage, setFilterSlotEl])

  React.useEffect(() => {
    if (isServicesPage) {
      const expanded = window.scrollY < COLLAPSE_THRESHOLD
      isHeaderExpandedRef.current = expanded
      setHeaderExpanded(expanded)
    }
  }, [isServicesPage, setHeaderExpanded])

  const isHeaderExpandedRef = React.useRef(true)

  const setHeaderHidden = useUIStore((s) => s.setHeaderHidden)
  const [hidden, setHidden] = React.useState(false)
  const hiddenRef = React.useRef(false)
  const setHiddenSynced = React.useCallback(
    (value: boolean) => {
      if (hiddenRef.current === value) return
      hiddenRef.current = value
      setHidden(value)
      setHeaderHidden(value)
    },
    [setHeaderHidden]
  )
  React.useEffect(() => {
    let lastY = window.scrollY
    let ticking = false
    const update = () => {
      const y = window.scrollY
      const diff = y - lastY
      if (y < 64) {
        setHiddenSynced(false)
      } else if (Math.abs(diff) > 6) {
        setHiddenSynced(diff > 0)
      }
      if (isServicesPageRef.current) {
        if (y <= EXPAND_THRESHOLD) {
          if (isManuallyExpandedRef.current) {
            isManuallyExpandedRef.current = false
            setIsManuallyExpanded(false)
          }
          if (!isHeaderExpandedRef.current) {
            isHeaderExpandedRef.current = true
            setHeaderExpanded(true)
          }
        } else if (y > COLLAPSE_THRESHOLD && !isManuallyExpandedRef.current) {
          if (isHeaderExpandedRef.current) {
            isHeaderExpandedRef.current = false
            setHeaderExpanded(false)
          }
        }
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

  React.useEffect(() => {
    if (hidden) setMenuOpen(false)
  }, [hidden])

  const handleSwitchRole = async () => {
    if (!isAuthenticated) {
      toast.info(tToast("switchRoleLoginRequired"))
      router.push("/login")
      return
    }

    try {
      const nextRole = isWorkerActive ? "client" : "worker"

      if (nextRole === "worker" && !hasWorkerRole) {
        toast.info(tToast("switchRoleWorkerRequired"))
        setMenuOpen(false)
        router.push("/worker/setup")
        return
      }

      await switchRoleMutation.mutateAsync({ last_active_role: nextRole })
      toast.success(tToast("switchRoleSuccess"))
      router.replace(getRoleDefaultRoute(nextRole))
      router.refresh()
    } catch (error) {
      toast.error(getErrorMessage(error, tToast("switchRoleError")))
    }
  }

  const handleLoginClick = async () => {
    try {
      await clearSessionCookie()
    } catch {}
    router.push("/login")
  }

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
      setMenuOpen(false)
      toast.success(tToast("logoutSuccess"))
      router.replace("/login")
    } catch (error) {
      toast.error(getErrorMessage(error, tToast("logoutError")))
    }
  }

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
      <LocaleSwitcher />
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
            aria-label={t("openUserMenu")}
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
            <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border bg-background p-1 shadow-lg">
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {user?.email ?? t("me")}
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
                {t("logout")}
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
            {t("login")}
          </Button>
          <Button size="sm" asChild className="hidden md:inline-flex">
            <Link href="/register">{t("register")}</Link>
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
        <div ref={servicesHeaderRef}>
          <div className="container mx-auto flex h-16 items-center justify-between px-4 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-4 md:px-6">
            <Link
              href={homeHref}
              className="flex shrink-0 items-center gap-2 justify-self-start font-semibold"
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

            {/* Center */}
            <div className="hidden items-center justify-center md:flex">
              {/* Grid stack: tab nav + compact pill overlap in same cell, no absolute toggling */}
              <div className="grid place-items-center">
                {/* Tab navigation */}
                <div
                  style={{ gridArea: "1/1" }}
                  className={cn(
                    "flex items-center gap-14 transition-[opacity,transform] duration-300",
                    showTabNav
                      ? "pointer-events-auto translate-y-0 opacity-100"
                      : "pointer-events-none -translate-y-1 opacity-0"
                  )}
                >
                  {HEADER_SERVICE_TABS.map((tab, i) => {
                    const isActive = activeTab === tab.value
                    return (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => {
                          triggerTabPop(i)
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
                          ref={(el) => {
                            tabWrapRefs.current[i] = el
                          }}
                          className="tab-icon-wrap"
                        >
                          <tab.icon
                            aria-hidden="true"
                            className="tab-icon-img size-6 select-none"
                          />
                        </span>
                        <span>{tab.label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Compact pill */}
                <button
                  type="button"
                  onClick={expandHeader}
                  style={{ gridArea: "1/1" }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-full border border-border bg-background/95 px-4 py-2 shadow-sm",
                    "text-sm transition-[opacity,transform] duration-300",
                    showCompactPill
                      ? "pointer-events-auto scale-100 opacity-100"
                      : "pointer-events-none scale-95 opacity-0"
                  )}
                >
                  <span className="font-medium text-foreground">
                    {selectedLocationLabel ?? tServices("anyLocation")}
                  </span>
                  <span className="h-4 w-px shrink-0 bg-border" />
                  <span className="text-muted-foreground">
                    {scheduledAtLabel ?? tServices("time")}
                  </span>
                  <span className="h-4 w-px shrink-0 bg-border" />
                  <span className="text-muted-foreground">
                    {activeTab === "COMPANIONSHIP"
                      ? tServices("companionship")
                      : tServices("assistance")}
                  </span>
                  <div className="ml-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Search className="size-3.5" />
                  </div>
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-1">
              {!isAuthenticated && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="hidden md:inline-flex"
                >
                  <Link href="/posts">{t("posts")}</Link>
                </Button>
              )}
              {rightActions}
            </div>
          </div>
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
                {[
                  { href: "/services", label: t("services") },
                  { href: "/posts", label: t("posts") },
                ].map((tab) => (
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
