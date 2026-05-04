"use client"

import * as React from "react"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { vi } from "date-fns/locale"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from "@/lib/hooks/use-notifications"
import type { Notification } from "@/services/notification.service"

export function NotificationBell() {
  const [open, setOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const { data: unreadData } = useUnreadNotificationCount()
  const { data: notifData, isLoading } = useNotifications({ page: 1, limit: 10 })
  const markAsReadMutation = useMarkNotificationAsRead()
  const markAllMutation = useMarkAllNotificationsAsRead()

  const unreadCount = unreadData?.unread_count ?? 0
  const notifications = notifData?.data ?? []

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener("mousedown", handleClickOutside)
    return () => window.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsReadMutation.mutateAsync(id)
    } catch {
      toast.error("Không thể đánh dấu đã đọc.")
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllMutation.mutateAsync()
      toast.success("Đã đánh dấu tất cả là đã đọc.")
    } catch {
      toast.error("Không thể đánh dấu tất cả đã đọc.")
    }
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
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="bg-background absolute right-0 z-50 mt-2 w-80 rounded-md border shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-3 cursor-pointer">
            <h3 className="text-sm font-semibold">Thông báo</h3>
            {unreadCount > 0 && (
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
            )}
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
                  onRead={handleMarkAsRead}
                  isMarking={markAsReadMutation.isPending && markAsReadMutation.variables === notif.id}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NotificationItem({
  notification,
  onRead,
  isMarking,
}: {
  notification: Notification
  onRead: (id: string) => void
  isMarking: boolean
}) {
  return (
    <button
      type="button"
      className={cn(
        "hover:bg-accent flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
        !notification.is_read && "bg-blue-50/50 dark:bg-blue-950/20",
      )}
      onClick={() => !notification.is_read && onRead(notification.id)}
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
      {isMarking && <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />}
    </button>
  )
}
