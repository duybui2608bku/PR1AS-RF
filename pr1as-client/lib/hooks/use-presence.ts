"use client"

import * as React from "react"
import { useTranslations } from "next-intl"

export type PresenceInfo = {
  is_online: boolean
  last_active_at: string | null
}

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const HIDE_AFTER_MS = 30 * DAY_MS
const REFRESH_INTERVAL_MS = 30_000

export function usePresenceLabel(
  presence: PresenceInfo | null | undefined
): string | null {
  const t = useTranslations("Presence")
  const [, forceTick] = React.useReducer((n: number) => n + 1, 0)

  React.useEffect(() => {
    if (presence?.is_online) return
    const id = setInterval(forceTick, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [presence?.is_online])

  if (!presence) return null
  if (presence.is_online) return t("online")
  if (!presence.last_active_at) return null

  const diffMs = Date.now() - new Date(presence.last_active_at).getTime()
  if (diffMs < MINUTE_MS) return t("justNow")
  if (diffMs < HOUR_MS) {
    return t("minutesAgo", { count: Math.floor(diffMs / MINUTE_MS) })
  }
  if (diffMs < DAY_MS) {
    return t("hoursAgo", { count: Math.floor(diffMs / HOUR_MS) })
  }
  if (diffMs < HIDE_AFTER_MS) {
    return t("daysAgo", { count: Math.floor(diffMs / DAY_MS) })
  }
  return null
}
