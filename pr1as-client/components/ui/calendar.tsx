"use client"

import * as React from "react"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react"
import { DayPicker, type Locale } from "react-day-picker"
import { enUS, vi, zhCN } from "react-day-picker/locale"
import { useLocale } from "next-intl"

import { buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

const DAY_PICKER_LOCALES: Record<string, Locale> = {
  vi,
  en: enUS,
  zh: zhCN,
}

// Themed month/year selectors shown when captionLayout is a "dropdown" variant.
// Rendered above the grid (not injected into react-day-picker), so it works for
// both popover DatePickers and inline <Calendar> usages, and never falls back to
// the browser's unstyled native <select> popup.
function CalendarDropdownHeader({
  locale,
  month,
  onMonthChange,
  startMonth,
  endMonth,
}: {
  locale: string
  month: Date
  onMonthChange: (date: Date) => void
  startMonth?: Date
  endMonth?: Date
}) {
  const monthFormatter = React.useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long" }),
    [locale]
  )
  const months = React.useMemo(
    () =>
      Array.from({ length: 12 }, (_, m) => ({
        value: m,
        label: monthFormatter.format(new Date(2000, m, 1)),
      })),
    [monthFormatter]
  )

  // Year range: bounded by startMonth/endMonth when given, else ~100 years back
  // (birth dates) and ~10 forward (booking). Always includes the shown year.
  const displayedYear = month.getFullYear()
  const todayYear = new Date().getFullYear()
  const toYear = Math.max(endMonth?.getFullYear() ?? todayYear + 10, displayedYear)
  const fromYear = Math.min(startMonth?.getFullYear() ?? todayYear - 100, displayedYear)
  const years = React.useMemo(
    () => Array.from({ length: toYear - fromYear + 1 }, (_, i) => toYear - i),
    [fromYear, toYear]
  )

  return (
    <div className="mb-3 flex justify-end gap-2">
      <Select
        value={String(month.getMonth())}
        onValueChange={(v) =>
          onMonthChange(new Date(month.getFullYear(), Number(v), 1))
        }
      >
        <SelectTrigger className="h-9 w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" className="max-h-72">
          {months.map((m) => (
            <SelectItem key={m.value} value={String(m.value)}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(displayedYear)}
        onValueChange={(v) =>
          onMonthChange(new Date(Number(v), month.getMonth(), 1))
        }
      >
        <SelectTrigger className="h-9 w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" className="max-h-72">
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale,
  components,
  captionLayout,
  month: monthProp,
  defaultMonth,
  onMonthChange,
  startMonth,
  endMonth,
  hideNavigation,
  ...props
}: CalendarProps) {
  const appLocale = useLocale()
  const resolvedLocale = locale ?? DAY_PICKER_LOCALES[appLocale] ?? vi

  const isDropdown =
    typeof captionLayout === "string" && captionLayout.startsWith("dropdown")

  // Track the displayed month so the themed dropdowns can drive the grid,
  // whether or not the consumer controls `month`.
  const [internalMonth, setInternalMonth] = React.useState<Date>(
    monthProp ?? defaultMonth ?? new Date()
  )
  const month = monthProp ?? internalMonth
  const handleMonthChange = React.useCallback(
    (next: Date) => {
      setInternalMonth(next)
      onMonthChange?.(next)
    },
    [onMonthChange]
  )

  return (
    <div className={cn("p-3", className)}>
      {isDropdown && (
        <CalendarDropdownHeader
          locale={appLocale}
          month={month}
          onMonthChange={handleMonthChange}
          startMonth={startMonth}
          endMonth={endMonth}
        />
      )}
      <DayPicker
        locale={resolvedLocale}
        showOutsideDays={showOutsideDays}
        month={month}
        onMonthChange={handleMonthChange}
        // In dropdown mode the header owns the range; passing these to DayPicker
        // would let it clamp the controlled month and fight the dropdowns.
        startMonth={isDropdown ? undefined : startMonth}
        endMonth={isDropdown ? undefined : endMonth}
        hideNavigation={isDropdown || hideNavigation}
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
          // Hide react-day-picker's own caption when our dropdown header is shown.
          ...(isDropdown ? { month_caption: "hidden" } : null),
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
          ...components,
        }}
        {...props}
      />
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
