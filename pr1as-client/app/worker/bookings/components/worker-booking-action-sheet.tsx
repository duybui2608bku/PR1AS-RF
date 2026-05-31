"use client"

import * as React from "react"
import { ChevronRight, Loader2 } from "lucide-react"

import {
  BottomSheet,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet"
import { cn } from "@/lib/utils"

export type WorkerBookingSheetItem = {
  key: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  destructive?: boolean
  loading?: boolean
  onSelect: () => void
}

type WorkerBookingActionSheetProps = {
  open: boolean
  title: string
  items: WorkerBookingSheetItem[]
  onOpenChange: (open: boolean) => void
}

export function WorkerBookingActionSheet({
  open,
  title,
  items,
  onOpenChange,
}: WorkerBookingActionSheetProps) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent className="pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="px-5 pb-2 text-center">
          <BottomSheetDescription className="text-xs">
            Hành động booking
          </BottomSheetDescription>
          <BottomSheetTitle className="truncate text-sm">
            {title}
          </BottomSheetTitle>
        </div>

        <div className="mt-1 px-3">
          <div className="overflow-hidden rounded-2xl border bg-card">
            {items.map((item, index) => {
              const Icon = item.icon
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.onSelect}
                  disabled={item.loading}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent active:bg-accent/70 disabled:opacity-60",
                    index < items.length - 1 && "border-b",
                    item.destructive && "text-destructive"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full",
                      item.destructive
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {item.loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Icon className="size-4" />
                    )}
                  </span>
                  <span className="flex-1 text-[15px] font-medium">
                    {item.label}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-3 px-3 pb-1">
          <BottomSheetClose asChild>
            <button
              type="button"
              className="h-12 w-full rounded-2xl border bg-card text-base font-semibold transition-colors hover:bg-accent active:scale-[0.99]"
            >
              Huỷ
            </button>
          </BottomSheetClose>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  )
}
