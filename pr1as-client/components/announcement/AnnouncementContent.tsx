"use client"

import { cn } from "@/lib/utils"
import type { Announcement } from "@/services/announcement.service"

interface AnnouncementContentProps {
  announcement: Announcement
  className?: string
}

export function AnnouncementCloseButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label="Đóng"
      className={cn(
        "absolute right-2 top-2 flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground",
        className
      )}
    >
      ✕
    </button>
  )
}

export function AnnouncementContent({ announcement, className }: AnnouncementContentProps) {
  const { content, redirect_url, redirect_target } = announcement

  const handleClick = () => {
    if (redirect_url) window.open(redirect_url, redirect_target ?? "_blank")
  }

  const handleInnerLinkClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a")) e.stopPropagation()
  }

  return (
    <div
      onClick={redirect_url ? handleClick : undefined}
      className={cn(
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5",
        redirect_url && "cursor-pointer",
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
      onClickCapture={handleInnerLinkClick}
    />
  )
}
