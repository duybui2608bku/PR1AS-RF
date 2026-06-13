"use client"

import {
  Bell,
  CalendarCheck2,
  CalendarDays,
  Crown,
  Flame,
  Heart,
  Loader2,
  LogOut,
  Settings,
  User,
  Wallet,
} from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import {
  BottomSheet,
  BottomSheetContent,
} from "@/components/ui/bottom-sheet"
import { useLogout } from "@/lib/hooks/use-auth"
import { useUnreadNotificationCount } from "@/lib/hooks/use-notifications"
import { useAuthStore } from "@/lib/store/auth-store"
import { getErrorMessage } from "@/lib/utils/error-handler"
import { getPlanRingClass } from "@/lib/utils/plan"
import { cn } from "@/lib/utils"

interface MobileMoreSheetProps {
  open: boolean
  onClose: () => void
}

const formatPricingPlan = (planCode: string | null | undefined) =>
  (planCode?.trim() || "standard").replace(/[-_]+/g, " ").toUpperCase()

export function MobileMoreSheet({ open, onClose }: MobileMoreSheetProps) {
  const router = useRouter()
  const t = useTranslations("Nav")
  const tToast = useTranslations("Toast")
  const tCommon = useTranslations("Common")
  const user = useAuthStore((s) => s.user)
  const logoutMutation = useLogout()
  const { data: unreadData } = useUnreadNotificationCount()
  const unreadCount = unreadData?.unread_count ?? 0

  const lastActiveRole = user?.last_active_role
  const fallbackRole =
    user?.role && ((user.roles?.length ?? 0) === 0 || user.roles?.includes(user.role))
      ? user.role
      : (user?.roles?.[0] ?? user?.role)
  const activeRole = (lastActiveRole ?? fallbackRole)?.toLowerCase()

  const handleNavigate = (href: string) => {
    onClose()
    router.push(href)
  }

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
      onClose()
      toast.success(tToast("logoutSuccess"))
      router.replace("/login")
    } catch (error) {
      toast.error(getErrorMessage(error, tToast("logoutError")))
    }
  }

  const profileHref =
    activeRole === "worker" && user?.id ? `/worker/${user.id}` : "/client/profile"

  const menuItems = [
    { href: profileHref, label: t("profile"), icon: User },
    { href: "/notifications", label: t("notifications"), icon: Bell, badge: unreadCount },
    ...(activeRole === "client"
      ? [{ href: "/client/favorites", label: t("favorites"), icon: Heart }]
      : []),
    ...(activeRole === "worker"
      ? [{ href: "/worker/bookings/schedule", label: t("schedule"), icon: CalendarDays }]
      : []),
    ...(activeRole === "worker"
      ? [{ href: "/worker/boost", label: t("boost"), icon: Flame }]
      : []),
    { href: "/wallet", label: t("wallet"), icon: Wallet },
    {
      href: activeRole === "worker" ? "/worker/bookings" : "/client/bookings",
      label: t("booking"),
      icon: CalendarCheck2,
    },
    { href: "/settings", label: t("settings"), icon: Settings },
    {
      href: "/pricing",
      label: formatPricingPlan(user?.meta_data?.pricing_plan_code),
      icon: Crown,
    },
  ]

  return (
    <BottomSheet open={open} onOpenChange={(v) => !v && onClose()}>
      <BottomSheetContent
        aria-describedby={undefined}
        className="pb-safe"
      >
        <div className="flex items-center gap-3 border-b px-4 py-3">
          {user?.avatar ? (
            <Image
              src={user.avatar}
              alt={user.email ?? "avatar"}
              width={40}
              height={40}
              className={cn(
                "size-10 rounded-full object-cover ring-2 ring-offset-2 ring-border ring-offset-background",
                getPlanRingClass(user?.meta_data?.pricing_plan_code),
              )}
            />
          ) : (
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-full bg-muted ring-2 ring-offset-2 ring-border ring-offset-background",
                getPlanRingClass(user?.meta_data?.pricing_plan_code),
              )}
            >
              <User className="size-5" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {user?.full_name ?? user?.email ?? tCommon("user")}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="px-2 py-2">
          {menuItems.map((item) => (
            <button
              key={item.href}
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
              onClick={() => handleNavigate(item.href)}
            >
              <item.icon className="size-5 shrink-0 text-muted-foreground" />
              <span className="flex-1">{item.label}</span>
              {"badge" in item && (item.badge as number) > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-semibold text-white">
                  {(item.badge as number) > 99 ? "99+" : (item.badge as number)}
                </span>
              )}
            </button>
          ))}
          <div className="my-1 border-t" />
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-accent dark:text-red-400"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? (
              <Loader2 className="size-5 shrink-0 animate-spin" />
            ) : (
              <LogOut className="size-5 shrink-0" />
            )}
            <span>{t("logout")}</span>
          </button>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  )
}
