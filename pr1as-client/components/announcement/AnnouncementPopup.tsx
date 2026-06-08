"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AnnouncementContent } from "./AnnouncementContent"
import type { Announcement } from "@/services/announcement.service"

interface AnnouncementPopupProps {
  announcement: Announcement
  onDismiss: () => void
}

export function AnnouncementPopup({ announcement, onDismiss }: AnnouncementPopupProps) {
  const [open, setOpen] = useState(true)

  const handleClose = () => {
    setOpen(false)
    onDismiss()
  }

  const { allow_close } = announcement

  const closeBtn = allow_close && (
    <button
      onClick={handleClose}
      aria-label="Đóng"
      className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
    >
      ✕
    </button>
  )

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && allow_close) handleClose() }}>
      <DialogContent className="max-h-[90svh] w-[calc(100%-3rem)] overflow-y-auto p-0 sm:w-fit sm:min-w-0 sm:max-w-[95vw] [&>button]:hidden">
        <DialogTitle className="sr-only">{announcement.title}</DialogTitle>
        <DialogDescription className="sr-only">{announcement.title}</DialogDescription>
        <div className="relative">
          {closeBtn}
          <AnnouncementContent announcement={announcement} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
