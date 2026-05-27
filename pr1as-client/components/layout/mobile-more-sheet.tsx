"use client"

import {
  CalendarCheck2,
  CalendarDays,
  Crown,
  Heart,
  Loader2,
  LogOut,
  Settings,
  User,
  Wallet,
} from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  BottomSheet,
  BottomSheetContent,
} from "@/components/ui/bottom-sheet"
import { useLogout } from "@/lib/hooks/use-auth"
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
  const user = useAuthStore((s) => s.user)
  const logoutMutation = useLogout()

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
      toast.success("Đăng xuất thành công.")
      router.replace("/login")
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể đăng xuất."))
    }
  }

  const profileHref =
    activeRole === "worker" && user?.id ? `/worker/${user.id}` : "/client/profile"

  // Menu items by role — excludes Chat / Posts (đã có trong bottom tab bar)
  const menuItems = [
    // Hồ sơ
    { href: profileHref, label: "Hồ sơ", icon: User },
    // Yêu thích — client only
    ...(activeRole === "client"
      ? [{ href: "/client/favorites", label: "Yêu thích", icon: Heart }]
      : []),
    // Schedule — worker only
    ...(activeRole === "worker"
      ? [{ href: "/worker/bookings/schedule", label: "Lịch làm việc", icon: CalendarDays }]
      : []),
    // Wallet
    { href: "/wallet", label: "Ví", icon: Wallet },
    // Booking (role-based)
    {
      href: activeRole === "worker" ? "/worker/bookings" : "/client/bookings",
      label: "Booking",
      icon: CalendarCheck2,
    },
    // Settings
    { href: "/settings", label: "Cài đặt", icon: Settings },
    // Pricing plan
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
        {/* User info */}
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
              {user?.full_name ?? user?.email ?? "Người dùng"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Menu items */}
        <div className="px-2 py-2">
          {menuItems.map((item) => (
            <button
              key={item.href}
              type="button"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
              onClick={() => handleNavigate(item.href)}
            >
              <item.icon className="size-5 shrink-0 text-muted-foreground" />
              <span>{item.label}</span>
            </button>
          ))}

          {/* Divider */}
          <div className="my-1 border-t" />

          {/* Logout */}
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
            <span>Đăng xuất</span>
          </button>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  )
}
