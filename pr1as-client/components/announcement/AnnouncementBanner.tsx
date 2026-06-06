"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { AnnouncementContent } from "./AnnouncementContent"
import type { Announcement } from "@/services/announcement.service"

interface AnnouncementBannerProps {
  announcement: Announcement
  onDismiss: () => void
  className?: string
}

export function AnnouncementBanner({ announcement, onDismiss, className }: AnnouncementBannerProps) {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  const handleDismiss = () => {
    setVisible(false)
    onDismiss()
  }

  return (
    <div className={cn("relative w-full", className)}>
      <AnnouncementContent announcement={announcement} />
      {announcement.allow_close && (
        <button
          onClick={handleDismiss}
          aria-label="Đóng"
          className="absolute right-2 top-2 flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          ✕
        </button>
      )}
    </div>
  )
}
