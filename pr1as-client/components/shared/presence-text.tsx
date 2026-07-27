"use client"

import { usePresenceLabel, type PresenceInfo } from "@/lib/hooks/use-presence"
import { cn } from "@/lib/utils"

export function PresenceText({
  presence,
  className,
}: {
  presence?: PresenceInfo | null
  className?: string
}) {
  const label = usePresenceLabel(presence)
  if (!label) return null

  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      {label}
    </span>
  )
}
