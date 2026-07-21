"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Clock3 } from "lucide-react"
import { useTranslations } from "next-intl"

import { AttendanceWidget } from "@/components/worker/attendance-widget"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getActiveRole } from "@/lib/auth/roles"
import { queryKeys } from "@/lib/query-keys"
import { useAuthStore } from "@/lib/store/auth-store"
import { boostService } from "@/services/boost.service"

const REMINDER_INTERVAL_MS = 60 * 60 * 1000

function getLocalDateKey() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function AttendanceReminderModal() {
  const t = useTranslations("WorkerBoost.attendance.reminder")
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isSessionLoaded = useAuthStore((state) => state._isSessionLoaded)
  const [open, setOpen] = React.useState(false)
  const [reminderVersion, setReminderVersion] = React.useState(0)

  const isWorker = getActiveRole(user) === "worker"
  const storageKey = user
    ? `attendance-reminder:${user.id}:${getLocalDateKey()}`
    : null

  const { data, isSuccess } = useQuery({
    queryKey: queryKeys.boostPoints,
    queryFn: () => boostService.getPoints(1, 0),
    enabled: isSessionLoaded && isAuthenticated && isWorker,
  })

  const lastAttendanceDate = data?.wallet.last_attendance_date
  const checkedInToday = lastAttendanceDate
    ? new Date(lastAttendanceDate).toDateString() === new Date().toDateString()
    : false
  const canRemind = isSuccess && isWorker && !checkedInToday && Boolean(storageKey)

  React.useEffect(() => {
    if (!canRemind || !storageKey) return

    const lastShownAt = Number(window.sessionStorage.getItem(storageKey) ?? 0)
    const remaining = Math.max(0, lastShownAt + REMINDER_INTERVAL_MS - Date.now())

    if (remaining === 0) {
      const timer = window.setTimeout(() => setOpen(true), 0)
      return () => window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => setOpen(true), remaining)
    return () => window.clearTimeout(timer)
  }, [canRemind, reminderVersion, storageKey])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen && !checkedInToday && storageKey) {
      window.sessionStorage.setItem(storageKey, String(Date.now()))
      setReminderVersion((version) => version + 1)
    }
  }

  return (
    <Dialog open={canRemind && open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden border-orange-200 p-0 sm:max-w-md dark:border-orange-900">
        <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-background p-6 dark:from-orange-950/50 dark:via-amber-950/20">
          <DialogHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/20">
              <Clock3 className="size-5" />
            </div>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>
        </div>
        <div className="p-4 pt-0">
          <AttendanceWidget />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {t("snoozeHint")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
