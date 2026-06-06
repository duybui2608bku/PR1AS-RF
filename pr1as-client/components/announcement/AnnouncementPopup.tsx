"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet"
import { useIsMobile } from "@/lib/hooks/use-is-mobile"
import { AnnouncementContent } from "./AnnouncementContent"
import type { Announcement } from "@/services/announcement.service"

interface AnnouncementPopupProps {
  announcement: Announcement
  onDismiss: () => void
}

export function AnnouncementPopup({ announcement, onDismiss }: AnnouncementPopupProps) {
  const [open, setOpen] = useState(true)
  const isMobile = useIsMobile()

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

  if (isMobile) {
    return (
      <BottomSheet open={open} onOpenChange={(v) => { if (!v && allow_close) handleClose() }}>
        <BottomSheetContent className="max-h-[90svh] overflow-y-auto p-0">
          <BottomSheetTitle className="sr-only">{announcement.title}</BottomSheetTitle>
          <div className="relative">
            {closeBtn}
            <AnnouncementContent announcement={announcement} />
          </div>
        </BottomSheetContent>
      </BottomSheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && allow_close) handleClose() }}>
      <DialogContent className="max-h-[90vh] w-fit min-w-0 max-w-[95vw] overflow-y-auto p-0 [&>button]:hidden">
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
