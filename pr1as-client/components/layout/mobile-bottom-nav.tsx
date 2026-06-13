"use client"

import { CalendarCheck2, FileText, Home, LogIn, MessageCircle, User } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import * as React from "react"

import { MobileMoreSheet } from "@/components/layout/mobile-more-sheet"
import { Button } from "@/components/ui/button"
import { useVisualViewportBottom } from "@/lib/hooks/use-visual-viewport"
import { getRoleRoute } from "@/lib/navigation/role-routes"
import { useAuthStore, useIsSessionLoaded } from "@/lib/store/auth-store"
import { useUIStore } from "@/lib/store/ui-store"
import { getPlanRingClass } from "@/lib/utils/plan"
import { cn } from "@/lib/utils"

export function MobileBottomNav() {
  const pathname = usePathname()
  const t = useTranslations("Nav")
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isSessionLoaded = useIsSessionLoaded()
  const hideBottomNav = useUIStore((s) => s.hideBottomNav)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const [hidden, setHidden] = React.useState(false)

  useVisualViewportBottom()

  // Auto-hide bottom nav kiểu Instagram: cuộn xuống → ẩn, cuộn lên → hiện.
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
  }, [])

  // Khi sheet đang mở, luôn hiện bottom nav
  React.useEffect(() => {
    if (moreOpen) setHidden(false)
  }, [moreOpen])

  if (hideBottomNav) return null

  // Admin dashboard có sidebar riêng — bottom nav dư thừa
  if (pathname.startsWith("/dashboard")) return null

  // Trang auth (full-screen app style) — bottom nav gây rối, ẩn đi
  const AUTH_ROUTES = ["/login", "/register", "/reset-password", "/verify-email"]
  if (AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"))) {
    return null
  }

  // Bottom nav tối giản cho guest user (chưa đăng nhập)
  if (!isAuthenticated) {
    const guestTabs = isSessionLoaded
      ? [
          { href: "/", label: t("home"), icon: Home, isActive: pathname === "/" },
          { href: "/posts", label: t("posts"), icon: FileText, isActive: pathname === "/posts" || pathname.startsWith("/posts/") },
          { href: "/login", label: t("login"), icon: LogIn, isActive: pathname === "/login" },
        ] as const
      : [
          { href: "/", label: t("home"), icon: Home, isActive: pathname === "/" },
          { href: "/posts", label: t("posts"), icon: FileText, isActive: pathname === "/posts" || pathname.startsWith("/posts/") },
        ] as const

    return (
      <nav
        className={cn(
          "fixed left-0 right-0 z-50 border-t bg-background/80 backdrop-blur transition-transform duration-300 will-change-transform supports-[backdrop-filter]:bg-background/60 md:hidden",
          hidden && "translate-y-full",
        )}
        style={{ bottom: "var(--bottom-toolbar-offset, 0px)" }}
      >
        <div className="px-safe flex items-center justify-around px-2 pb-safe">
          {guestTabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 transition-transform active:scale-90 touch-manipulation",
                tab.isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <tab.icon
                className={cn(
                  "size-6",
                  tab.isActive && "fill-foreground stroke-background",
                )}
              />
              <span className="text-[10px] leading-none">{tab.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    )
  }

  const lastActiveRole = user?.last_active_role
  const fallbackRole =
    user?.role && ((user.roles?.length ?? 0) === 0 || user.roles?.includes(user.role))
      ? user.role
      : (user?.roles?.[0] ?? user?.role)
  const activeRole = lastActiveRole ?? fallbackRole

  const chatHref = getRoleRoute("chat", activeRole, "/client/chat")
  const isWorker = activeRole?.toLowerCase() === "worker"

  const isPostsActive = pathname === "/posts" || pathname.startsWith("/posts/")
  const isChatActive = pathname === chatHref || pathname.startsWith(chatHref + "/")
  const isHomeActive = pathname === "/"
  const isBookingsActive =
    pathname === "/worker/bookings" || pathname.startsWith("/worker/bookings/")

  const navTabs = isWorker
    ? [
        {
          type: "link" as const,
          href: "/posts",
          label: t("posts"),
          icon: FileText,
          isActive: isPostsActive,
        },
        {
          type: "link" as const,
          href: chatHref,
          label: t("chat"),
          icon: MessageCircle,
          isActive: isChatActive,
        },
        {
          type: "link" as const,
          href: "/worker/bookings",
          label: t("booking"),
          icon: CalendarCheck2,
          isActive: isBookingsActive,
        },
        {
          type: "button" as const,
          label: t("me"),
          isActive: moreOpen,
        },
      ]
    : [
        {
          type: "link" as const,
          href: "/",
          label: t("home"),
          icon: Home,
          isActive: isHomeActive,
        },
        {
          type: "link" as const,
          href: "/posts",
          label: t("posts"),
          icon: FileText,
          isActive: isPostsActive,
        },
        {
          type: "link" as const,
          href: chatHref,
          label: t("chat"),
          icon: MessageCircle,
          isActive: isChatActive,
        },
        {
          type: "button" as const,
          label: t("me"),
          isActive: moreOpen,
        },
      ]

  return (
    <>
      <nav
        className={cn(
          "fixed left-0 right-0 z-50 border-t bg-background/80 backdrop-blur transition-transform duration-300 will-change-transform supports-[backdrop-filter]:bg-background/60 md:hidden",
          hidden && "translate-y-full",
        )}
        style={{ bottom: "var(--bottom-toolbar-offset, 0px)" }}
      >
        <div className="px-safe flex items-center justify-around px-2 pb-safe">
          {navTabs.map((tab) => {
            const iconClass = cn(
              "size-6",
              tab.isActive && tab.type === "link" && "fill-foreground stroke-background",
            )
            const itemClass = cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 transition-transform active:scale-90 touch-manipulation",
              tab.isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )

            if (tab.type === "button") {
              return (
                <Button
                  key={tab.label}
                  variant="ghost"
                  className={itemClass}
                  onClick={() => setMoreOpen(true)}
                >
                  {user?.avatar ? (
                    <Image
                      src={user.avatar}
                      alt={user.full_name ?? user.email ?? "avatar"}
                      width={24}
                      height={24}
                      className={cn(
                        "size-6 rounded-full object-cover ring-2 ring-offset-1 ring-offset-background",
                        moreOpen ? "ring-foreground" : "ring-border",
                        getPlanRingClass(user?.meta_data?.pricing_plan_code),
                      )}
                    />
                  ) : (
                    <div
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full bg-muted ring-2 ring-offset-1 ring-offset-background",
                        moreOpen ? "ring-foreground" : "ring-border",
                        getPlanRingClass(user?.meta_data?.pricing_plan_code),
                      )}
                    >
                      <User className="size-3.5" />
                    </div>
                  )}
                  <span className="text-[10px] leading-none font-normal">{tab.label}</span>
                </Button>
              )
            }

            return (
              <Link key={tab.href} href={tab.href} className={itemClass}>
                <tab.icon className={iconClass} />
                <span className="text-[10px] leading-none">{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  )
}
