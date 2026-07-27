"use client"

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
  const label = usePresenceLabel(presence)
  if (!presence?.is_online) return null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            role="img"
            aria-label={label ?? undefined}
            className={cn(
              "block size-2.5 rounded-full border-2 border-background bg-green-500",
              className
            )}
          />
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
