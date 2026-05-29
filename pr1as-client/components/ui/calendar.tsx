"use client"

import * as React from "react"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { vi } from "react-day-picker/locale"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = true, locale = vi, ...props }: CalendarProps) {
  return (
    <DayPicker
      locale={locale}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: "min-w-[280px]",
        months: "relative flex flex-col gap-4 sm:flex-row",
        month: "w-full space-y-4",
        month_caption: "flex h-9 items-center justify-center",
        caption_label: "text-sm font-medium",
        nav: "absolute inset-x-0 top-0 z-10 flex items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "size-9 bg-transparent p-0 opacity-70 hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "size-9 bg-transparent p-0 opacity-70 hover:opacity-100",
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex w-full",
        weekday: "flex-1 rounded-md text-[0.8rem] font-normal text-muted-foreground",
        week: "mt-2 flex w-full",
        // Range: td nhận bg-accent để tạo thanh nối liên tục
        day: cn(
          "relative flex-1 p-0 text-center text-sm focus-within:relative focus-within:z-20",
          "[&:has([aria-selected])]:bg-accent",
          "[&:has([aria-selected].day-range-start)]:rounded-l-md",
          "[&:has([aria-selected].day-range-end)]:rounded-r-md",
          "first:[&:has([aria-selected].day-range-end)]:rounded-l-md",
          "last:[&:has([aria-selected].day-range-start)]:rounded-r-md",
          "[&:has([aria-selected].day-outside)]:bg-accent/50",
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-full rounded-md p-0 font-normal aria-selected:opacity-100",
          "hover:bg-accent hover:text-accent-foreground",
        ),
        today: "rounded-md bg-accent text-accent-foreground border border-border",
        // start/end: button nhận màu primary (vẽ lên trên nền accent của td)
        selected:
          "rounded-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        // Thêm marker class để td targeting, override bo tròn & màu nền
        range_start: "day-range-start",
        range_end: "day-range-end",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground aria-selected:rounded-none",
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation }) => {
          const Icon =
            orientation === "left"
              ? ChevronLeft
              : orientation === "right"
                ? ChevronRight
                : orientation === "up"
                  ? ChevronUp
                  : ChevronDown

          return <Icon className={cn("size-4", className)} />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
