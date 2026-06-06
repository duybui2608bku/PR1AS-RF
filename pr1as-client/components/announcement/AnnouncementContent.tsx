"use client"

import { cn } from "@/lib/utils"
import type { Announcement } from "@/services/announcement.service"

interface AnnouncementContentProps {
  announcement: Announcement
  className?: string
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
