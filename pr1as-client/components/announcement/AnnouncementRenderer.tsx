"use client"

import { useAnnouncementByPlacement } from "@/lib/hooks/use-announcements"
import {
  shouldShowAnnouncement,
  dismissAnnouncement,
} from "@/lib/utils/announcement-dismissal"
import { useAuthStore } from "@/lib/store/auth-store"
import { AnnouncementPopup } from "./AnnouncementPopup"
import { AnnouncementBanner } from "./AnnouncementBanner"
import { AnnouncementInline } from "./AnnouncementInline"
import type { PlacementValue } from "@/config/announcement-placements"

interface AnnouncementRendererProps {
  placement: PlacementValue
  className?: string
}

export function AnnouncementRenderer({
  placement,
  className,
}: AnnouncementRendererProps) {
  const user = useAuthStore((state) => state.user)
  const { data: announcement } = useAnnouncementByPlacement(placement)

  if (!announcement || !user) return null
  if (!shouldShowAnnouncement(announcement, user.id)) return null

  const handleDismiss = () => dismissAnnouncement(announcement, user.id)

  return (
    <>
      {announcement.display_types.map((displayType) => {
        switch (displayType) {
          case "popup":
            return (
              <AnnouncementPopup
                key="popup"
                announcement={announcement}
                onDismiss={handleDismiss}
              />
            )
          case "banner":
            return (
              <AnnouncementBanner
                key="banner"
                announcement={announcement}
                onDismiss={handleDismiss}
                className={className}
              />
            )
          case "inline":
            return (
              <AnnouncementInline
                key="inline"
                announcement={announcement}
                onDismiss={handleDismiss}
                className={className}
              />
            )
          default:
            return null
        }
      })}
    </>
  )
}
