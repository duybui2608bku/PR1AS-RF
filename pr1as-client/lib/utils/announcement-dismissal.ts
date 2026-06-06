import type { Announcement } from "@/services/announcement.service"

const storageKey = (userId: string, announcementId: string) =>
  `ann_${userId}_${announcementId}`

export function shouldShowAnnouncement(
  announcement: Announcement,
  userId: string
): boolean {
  const { display_behavior, id } = announcement

  if (display_behavior === "always") return true

  const key = storageKey(userId, id)

  if (display_behavior === "once_device") {
    return !localStorage.getItem(key)
  }

  if (display_behavior === "once_session") {
    return !sessionStorage.getItem(key)
  }

  if (display_behavior === "once_daily") {
    const stored = localStorage.getItem(key)
    if (!stored) return true
    const lastShown = parseInt(stored, 10)
    return Date.now() - lastShown > 86_400_000
  }

  return true
}

export function dismissAnnouncement(
  announcement: Announcement,
  userId: string
): void {
  const { display_behavior, id } = announcement
  if (display_behavior === "always") return

  const key = storageKey(userId, id)
  const value = Date.now().toString()

  if (display_behavior === "once_session") {
    sessionStorage.setItem(key, value)
  } else {
    localStorage.setItem(key, value)
  }
}
