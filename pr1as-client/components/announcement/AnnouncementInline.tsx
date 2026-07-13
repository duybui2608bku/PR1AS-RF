"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { AnnouncementContent, AnnouncementCloseButton } from "./AnnouncementContent"
import type { Announcement } from "@/services/announcement.service"

interface AnnouncementInlineProps {
  announcement: Announcement
  onDismiss: () => void
  className?: string
}

export function AnnouncementInline({ announcement, onDismiss, className }: AnnouncementInlineProps) {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  const handleDismiss = () => {
    setVisible(false)
    onDismiss()
  }

  return (
    <div className={cn("relative", className)}>
      <AnnouncementContent announcement={announcement} />
      {announcement.allow_close && <AnnouncementCloseButton onClick={handleDismiss} />}
    </div>
  )
}
