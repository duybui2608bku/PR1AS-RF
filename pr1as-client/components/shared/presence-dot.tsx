"use client"

import { useTranslations } from "next-intl"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { usePresenceLabel, type PresenceInfo } from "@/lib/hooks/use-presence"
import { cn } from "@/lib/utils"

export function PresenceDot({
  presence,
  className,
}: {
  presence?: PresenceInfo | null
  className?: string
}) {
  const t = useTranslations("Presence")
  const label = usePresenceLabel(presence)
  if (!presence) return null

  // Always show the dot (green online, grey offline) rather than hiding it
  // offline — an offline-only-hidden dot never taught users the feature exists.
  const displayLabel = label ?? t("offline")

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            role="img"
            aria-label={displayLabel}
            className={cn(
              "block size-4 rounded-full border-[3px] border-background",
              presence.is_online ? "bg-green-500" : "bg-muted-foreground/60",
              className
            )}
          />
        </TooltipTrigger>
        <TooltipContent>{displayLabel}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
