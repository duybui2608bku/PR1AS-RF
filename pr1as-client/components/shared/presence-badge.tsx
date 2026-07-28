"use client"

import { useTranslations } from "next-intl"

import { type PresenceInfo } from "@/lib/hooks/use-presence"
import { cn } from "@/lib/utils"

// Worker cards need to read at a glance on mobile, where a bare dot has no
// affordance (no hover to reveal a tooltip) — so this shows the state as text
// directly, unlike PresenceDot which relies on a hover/tap tooltip.
export function PresenceBadge({
  presence,
  className,
}: {
  presence?: PresenceInfo | null
  className?: string
}) {
  const t = useTranslations("Presence")
  if (!presence) return null

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow",
        presence.is_online
          ? "bg-green-500 text-white"
          : "bg-background/90 text-muted-foreground",
        className
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          presence.is_online ? "bg-white" : "bg-muted-foreground"
        )}
      />
      {presence.is_online ? t("onlineBadge") : t("offline")}
    </div>
  )
}
