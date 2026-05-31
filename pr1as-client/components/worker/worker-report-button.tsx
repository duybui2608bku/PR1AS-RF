"use client"

import { Flag } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type Props = {
  hasOpenReport: boolean
  onReport: () => void
  /** "overlay" matches the floating favorite button on the mobile hero. */
  variant?: "overlay" | "default"
  className?: string
}

const PENDING_MESSAGE =
  "Báo cáo của bạn đang được xử lý. Bạn có thể gửi báo cáo mới sau khi admin hoàn tất báo cáo hiện tại."

export function WorkerReportButton({
  hasOpenReport,
  onReport,
  variant = "default",
  className,
}: Props) {
  // ── Mobile overlay: icon-only pill matching the favorite button's size. ──
  if (variant === "overlay") {
    const overlayClass = cn(
      "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-all active:scale-95",
      hasOpenReport
        ? "bg-amber-400/90 text-white"
        : "border border-white/40 bg-white/20 text-white hover:bg-white/30",
      className
    )

    if (hasOpenReport) {
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" aria-label="Báo cáo" className={overlayClass}>
              <Flag className="size-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="text-sm">
            {PENDING_MESSAGE}
          </PopoverContent>
        </Popover>
      )
    }

    return (
      <button
        type="button"
        onClick={onReport}
        aria-label="Báo cáo"
        className={overlayClass}
      >
        <Flag className="size-3.5" />
      </button>
    )
  }

  // ── Desktop: outline button with label. ──
  if (hasOpenReport) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <span className="inline-flex">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              className={cn(
                "gap-1.5 border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-100 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200",
                className
              )}
            >
              <Flag className="size-3.5" />
            </Button>
          </span>
        </PopoverTrigger>
        <PopoverContent align="end" className="text-sm">
          {PENDING_MESSAGE}
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onReport}
      className={cn("gap-1.5 text-muted-foreground", className)}
    >
      <Flag className="size-3.5" />
    </Button>
  )
}
