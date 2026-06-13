"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CalendarCheck2,
  CalendarClock,
  CalendarPlus,
  CalendarX,
  CheckCircle2,
  CheckCheck,
  Loader2,
  Lock,
  MessageCircle,
  RotateCcw,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns"
import { vi } from "date-fns/locale"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/store/auth-store"
import { getActiveRole } from "@/lib/auth/roles"
import { useSwitchRole } from "@/lib/hooks/use-auth"
import {
  useNotificationsInfinite,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useNotificationSocket,
} from "@/lib/hooks/use-notifications"
import type { Notification } from "@/services/notification.service"

type NotifTypeConfig = { icon: React.ElementType; bg: string }

const NOTIF_TYPE_CONFIG: Record<string, NotifTypeConfig> = {
  "chat.message": { icon: MessageCircle, bg: "bg-blue-500" },
  "chat.group_message": { icon: Users, bg: "bg-indigo-500" },
  "booking.created": { icon: CalendarPlus, bg: "bg-emerald-500" },
  "booking.cancelled": { icon: CalendarX, bg: "bg-red-500" },
  "booking.updated": { icon: CalendarClock, bg: "bg-amber-500" },
  "booking.status_updated": { icon: CalendarCheck2, bg: "bg-violet-500" },
  "dispute.created": { icon: AlertTriangle, bg: "bg-orange-500" },
  "dispute.resolved": { icon: CheckCircle2, bg: "bg-emerald-500" },
  "review.created": { icon: Star, bg: "bg-yellow-500" },
  "review.updated": { icon: Star, bg: "bg-amber-500" },
  "wallet.deposit_success": { icon: TrendingUp, bg: "bg-emerald-500" },
  "wallet.deposit_failed": { icon: TrendingDown, bg: "bg-red-500" },
  "wallet.hold_created": { icon: Lock, bg: "bg-orange-500" },
  "wallet.refund_created": { icon: RotateCcw, bg: "bg-sky-500" },
  "wallet.withdraw": { icon: Wallet, bg: "bg-teal-500" },
}

function getTypeConfig(type: string): NotifTypeConfig {
  return NOTIF_TYPE_CONFIG[type] ?? { icon: Bell, bg: "bg-muted-foreground/50" }
}

function getNotificationUrl(notif: Notification): string | null {
  if (notif.type === "chat.message") {
    const cid = notif.data?.conversation_id as string | undefined
    return cid ? `/chat?conversation_id=${cid}` : (notif.link ?? null)
  }
  if (notif.type === "chat.group_message") {
    const gid = notif.data?.conversation_group_id as string | undefined
    return gid ? `/chat?conversation_group_id=${gid}` : (notif.link ?? null)
  }
  return notif.link ?? null
}

function getRequiredRole(url: string): "worker" | "client" | null {
  if (url.startsWith("/worker")) return "worker"
  if (url.startsWith("/client")) return "client"
  return null
}

function groupByDate(notifications: Notification[]) {
  const groups: { label: string; items: Notification[] }[] = [
    { label: "Hôm nay", items: [] },
    { label: "Hôm qua", items: [] },
    { label: "Tuần này", items: [] },
    { label: "Cũ hơn", items: [] },
  ]
  for (const n of notifications) {
    const d = new Date(n.created_at)
    if (isToday(d)) groups[0].items.push(n)
    else if (isYesterday(d)) groups[1].items.push(n)
    else if (isThisWeek(d, { weekStartsOn: 1 })) groups[2].items.push(n)
    else groups[3].items.push(n)
  }
  return groups.filter((g) => g.items.length > 0)
}

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <div className="size-11 shrink-0 rounded-full bg-muted animate-pulse" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="h-[15px] w-3/5 rounded-md bg-muted animate-pulse" />
        <div className="h-3 w-full rounded-md bg-muted animate-pulse" />
        <div className="h-3 w-2/3 rounded-md bg-muted animate-pulse" />
        <div className="h-3 w-1/4 rounded-md bg-muted animate-pulse" />
      </div>
    </div>
  )
}

function NotifRow({
  notification,
  onClick,
  isLast,
}: {
  notification: Notification
  onClick: () => void
  isLast: boolean
}) {
  const { icon: Icon, bg } = getTypeConfig(notification.type)
  const isUnread = !notification.is_read

  return (
    <Button
      asChild
      variant="ghost"
      className={cn(
        "relative flex h-auto w-full items-start gap-3 rounded-none px-4 py-3.5 text-left transition-colors active:bg-accent",
        isUnread && "bg-blue-50/70 dark:bg-blue-950/25",
      )}
      onClick={onClick}
    >
      <div>
        {/* Icon avatar */}
        <div className="relative mt-0.5 shrink-0">
          <div
            className={cn(
              "flex size-11 items-center justify-center rounded-full text-white shadow-sm",
              bg,
            )}
          >
            <Icon className="size-[22px]" />
          </div>
          {isUnread && (
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background bg-blue-500" />
          )}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[15px] leading-[1.3] whitespace-normal",
              isUnread ? "font-semibold text-foreground" : "font-normal text-foreground/85",
            )}
          >
            {notification.title}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted-foreground whitespace-normal">
            {notification.body}
          </p>
          <p className="mt-1.5 text-[12px] font-medium text-muted-foreground/60">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: vi,
            })}
          </p>
        </div>

        {/* Unread dot — iOS right-side indicator */}
        {isUnread && (
          <div className="mt-1.5 shrink-0 self-start">
            <span className="size-2.5 rounded-full bg-blue-500 block" />
          </div>
        )}

        {/* Row divider (iOS-style: left-inset) */}
        {!isLast && (
          <div className="pointer-events-none absolute bottom-0 left-[68px] right-0 h-px bg-border/50" />
        )}
      </div>
    </Button>
  )
}

export default function NotificationsPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const switchRoleMutation = useSwitchRole()

  useNotificationSocket()

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch, isRefetching } =
    useNotificationsInfinite()
  const { data: unreadData } = useUnreadNotificationCount()
  const markAsReadMutation = useMarkNotificationAsRead()
  const markAllMutation = useMarkAllNotificationsAsRead()

  const unreadCount = unreadData?.unread_count ?? 0

  const allNotifications = React.useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  )

  const groups = React.useMemo(() => groupByDate(allNotifications), [allNotifications])

  // Pull-to-refresh
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const touchStartY = React.useRef(0)
  const [pullRefreshing, setPullRefreshing] = React.useState(false)

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }

  const onTouchEnd = async (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientY - touchStartY.current
    const atTop = (scrollRef.current?.scrollTop ?? 0) <= 0
    if (delta > 60 && atTop && !isRefetching) {
      setPullRefreshing(true)
      await refetch()
      setPullRefreshing(false)
    }
  }

  // Auto-load more when near bottom
  const onScroll = React.useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
      if (scrollHeight - scrollTop - clientHeight < 120 && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage()
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  )

  const handleMarkAll = async () => {
    try {
      await markAllMutation.mutateAsync()
      toast.success("Đã đánh dấu tất cả là đã đọc.")
    } catch {
      toast.error("Không thể đánh dấu tất cả đã đọc.")
    }
  }

  const handleItemClick = async (notif: Notification) => {
    if (!notif.is_read) {
      markAsReadMutation.mutate(notif.id)
    }
    const url = getNotificationUrl(notif)
    if (url) {
      const requiredRole = getRequiredRole(url)
      const currentRole = getActiveRole(user)
      if (requiredRole && currentRole !== requiredRole && user) {
        setUser({ ...user, last_active_role: requiredRole })
        switchRoleMutation.mutate({ last_active_role: requiredRole })
      }
      router.push(url)
    }
  }

  return (
    <div className="flex h-svh flex-col bg-background">
      {/* ── iOS Navigation Bar ── */}
      <div className="pt-safe z-20 shrink-0 border-b bg-background/95 backdrop-blur-md">
        <div className="grid h-11 grid-cols-3 items-center px-1">
          {/* Back */}
          <Button
            variant="ghost"
            size="sm"
            className="flex w-fit items-center gap-0.5 px-2 text-[17px] font-normal text-blue-500 hover:bg-transparent hover:text-blue-600 active:opacity-60"
            onClick={() => router.back()}
          >
            <ArrowLeft className="size-[22px] stroke-[2]" />
            <span className="hidden sm:inline">Trở về</span>
          </Button>

          {/* Title */}
          <h1 className="text-center text-[17px] font-semibold leading-none">Thông báo</h1>

          {/* Mark all */}
          <div className="flex justify-end pr-1">
            {unreadCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-[15px] font-normal text-blue-500 hover:bg-transparent hover:text-blue-600 active:opacity-60"
                onClick={handleMarkAll}
                disabled={markAllMutation.isPending}
              >
                {markAllMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-1">
                    <CheckCheck className="size-4" />
                    Đọc tất cả
                  </span>
                )}
              </Button>
            ) : (
              <div className="w-[90px]" />
            )}
          </div>
        </div>
      </div>

      {/* ── Pull-to-refresh indicator ── */}
      <div
        className={cn(
          "shrink-0 overflow-hidden transition-all duration-200",
          pullRefreshing || isRefetching ? "h-10" : "h-0",
        )}
      >
        <div className="flex items-center justify-center py-2.5">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        onScroll={onScroll}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {isLoading ? (
          /* Skeleton */
          <div>
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : allNotifications.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center px-8 py-24 text-center">
            <div className="mb-5 flex size-24 items-center justify-center rounded-full bg-muted/70">
              <Bell className="size-11 text-muted-foreground/50" />
            </div>
            <h3 className="text-[18px] font-semibold">Chưa có thông báo</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              Các thông báo mới về booking, tin nhắn và ví sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <section key={group.label}>
                {/* Section header — iOS sticky label */}
                <div className="sticky top-0 z-10 bg-background/90 px-4 pb-1.5 pt-4 backdrop-blur-sm">
                  <span className="text-[12px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    {group.label}
                  </span>
                </div>

                {/* Notification rows */}
                <div className="rounded-none">
                  {group.items.map((notif, idx) => (
                    <NotifRow
                      key={notif.id}
                      notification={notif}
                      onClick={() => void handleItemClick(notif)}
                      isLast={idx === group.items.length - 1}
                    />
                  ))}
                </div>
              </section>
            ))}

            {/* Pagination states */}
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-5">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!hasNextPage && allNotifications.length > 5 && (
              <p className="py-7 text-center text-[13px] text-muted-foreground/60">
                Đã hiển thị tất cả thông báo
              </p>
            )}
          </>
        )}

        {/* Mobile bottom nav spacer */}
        <div className="h-bottomnav shrink-0 md:hidden" aria-hidden="true" />
      </div>
    </div>
  )
}
