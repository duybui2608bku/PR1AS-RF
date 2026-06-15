"use client"

import * as React from "react"
import { AlarmClock } from "lucide-react"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

type BookingCountdownProps = {
  /** Confirmation deadline as a millisecond timestamp. */
  deadline: number
  className?: string
}

const HOUR_MS = 60 * 60 * 1000

/**
 * Live countdown to a booking's confirmation deadline. Ticks every second and
 * turns urgent (amber → red) as the deadline approaches, then shows an expired
 * label once the deadline passes.
 */
export function BookingCountdown({ deadline, className }: BookingCountdownProps) {
  const t = useTranslations("BookingCountdown")
  const [now, setNow] = React.useState(() => Date.now())

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const remaining = deadline - now
  const expired = remaining <= 0

  let timeText = ""
  if (!expired) {
    const totalSeconds = Math.floor(remaining / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const parts: string[] = []
    if (hours > 0) {
      parts.push(`${hours}${t("unitHour")}`, `${minutes}${t("unitMinute")}`)
    } else if (minutes > 0) {
      parts.push(`${minutes}${t("unitMinute")}`, `${seconds}${t("unitSecond")}`)
    } else {
      parts.push(`${seconds}${t("unitSecond")}`)
    }
    timeText = parts.join(" ")
  }

  const urgent = !expired && remaining <= HOUR_MS

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        expired
          ? "text-muted-foreground"
          : urgent
            ? "text-red-600 dark:text-red-400"
            : "text-amber-600 dark:text-amber-400",
        className
      )}
    >
      <AlarmClock className="size-3.5 shrink-0" />
      {expired ? t("expired") : t("confirmExpiresIn", { time: timeText })}
    </span>
  )
}

BookingCountdown.displayName = "BookingCountdown"
