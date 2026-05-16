"use client"

import * as React from "react"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useClickOutside } from "@/lib/hooks/use-click-outside"
import { useSwitchRole } from "@/lib/hooks/use-auth"
import { useAuthStore } from "@/lib/store/auth-store"
import { getActiveRole } from "@/lib/auth/roles"
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from "@/lib/hooks/use-notifications"
import type { Notification } from "@/services/notification.service"

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

export function NotificationBell() {
  const [open, setOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const router = useRouter()

  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const switchRoleMutation = useSwitchRole()

  const { data: unreadData } = useUnreadNotificationCount()
  const { data: notifData, isLoading } = useNotifications({ page: 1, limit: 10 })
  const markAsReadMutation = useMarkNotificationAsRead()
  const markAllMutation = useMarkAllNotificationsAsRead()

  const unreadCount = unreadData?.unread_count ?? 0
  const notifications = notifData?.data ?? []

  useClickOutside(dropdownRef, () => setOpen(false), open)

  const handleMarkAllAsRead = async () => {
    try {
      await markAllMutation.mutateAsync()
      toast.success("Đã đánh dấu tất cả là đã đọc.")
    } catch {
      toast.error("Không thể đánh dấu tất cả đã đọc.")
    }
  }

  const handleItemClick = async (notif: Notification) => {
    try {
      if (!notif.is_read) {
        await markAsReadMutation.mutateAsync(notif.id)
      }
    } catch {
      toast.error("Không thể đánh dấu đã đọc.")
    }

    const url = getNotificationUrl(notif)
    if (url) {
      const requiredRole = getRequiredRole(url)
      const currentRole = getActiveRole(user)
      if (requiredRole && currentRole !== requiredRole && user) {
        // Cập nhật role ngay lập tức (optimistic) để cookie được set trước khi navigate
        setUser({ ...user, last_active_role: requiredRole })
        // Persist lên server ở background
        switchRoleMutation.mutate({ last_active_role: requiredRole })
      }
      router.push(url)
    }
    setOpen(false)
  }

  return (
    <div ref={dropdownRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Thông báo"
        onClick={() => setOpen((v) => !v)}
        className="relative"
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="bg-background absolute right-0 z-50 mt-2 w-80 rounded-md border shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-3 cursor-pointer">
            <h3 className="text-sm font-semibold">Thông báo</h3>
            {unreadCount > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto gap-1 px-2 py-1 text-xs"
                onClick={handleMarkAllAsRead}
                disabled={markAllMutation.isPending}
              >
                {markAllMutation.isPending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <CheckCheck className="size-3" />
                )}
                Đọc tất cả
              </Button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Chưa có thông báo nào
              </div>
            ) : (
              notifications.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  notification={notif}
                  onClick={() => handleItemClick(notif)}
                  isMarking={markAsReadMutation.isPending && markAsReadMutation.variables === notif.id}
                />
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function NotificationItem({
  notification,
  onClick,
  isMarking,
}: {
  notification: Notification
  onClick: () => void
  isMarking: boolean
}) {
  return (
    <button
      type="button"
      className={cn(
        "hover:bg-accent flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
        !notification.is_read && "bg-blue-50/50 dark:bg-blue-950/20",
      )}
      onClick={onClick}
      disabled={isMarking}
    >
      <div className="mt-0.5 shrink-0">
        {!notification.is_read ? (
          <span className="flex size-2 rounded-full bg-blue-500" />
        ) : (
          <span className="flex size-2 rounded-full bg-transparent" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm", !notification.is_read && "font-medium")}>
          {notification.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
            locale: vi,
          })}
        </p>
      </div>
      {isMarking ? <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" /> : null}
    </button>
  )
}
