"use client"

import * as React from "react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { useLocale } from "next-intl"

import { Button } from "@/components/ui/button"
import { Calendar, type CalendarProps } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type DatePickerProps = {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  buttonClassName?: string
  fromDate?: Date
  toDate?: Date
  /** Show month/year dropdowns — handy for far-back dates like birthdays. */
  captionLayout?: CalendarProps["captionLayout"]
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Chọn ngày",
  disabled,
  className,
  buttonClassName,
  fromDate,
  toDate,
  captionLayout,
}: DatePickerProps) {
  const appLocale = useLocale()
  const [open, setOpen] = React.useState(false)

  const isDropdown =
    typeof captionLayout === "string" && captionLayout.startsWith("dropdown")
  const endDate = toDate ?? new Date()
  // The displayed month — controlled so our dropdowns can drive the grid.
  const [month, setMonth] = React.useState<Date>(value ?? endDate)
  // Reopen on the currently selected month (or today) each time.
  const handleOpenChange = (next: boolean) => {
    if (next) setMonth(value ?? endDate)
    setOpen(next)
  }

  let disabledDays: CalendarProps["disabled"]
  if (fromDate && toDate) {
    disabledDays = [{ before: fromDate }, { after: toDate }]
  } else if (fromDate) {
    disabledDays = { before: fromDate }
  } else if (toDate) {
    disabledDays = { after: toDate }
  }

  const handleSelect = (date: Date | undefined) => {
    onChange?.(date)
    setOpen(false)
  }

  // Month/year option lists for the dropdown layout.
  const monthFormatter = React.useMemo(
    () => new Intl.DateTimeFormat(appLocale, { month: "long" }),
    [appLocale]
  )
  const months = React.useMemo(
    () =>
      Array.from({ length: 12 }, (_, m) => ({
        value: m,
        label: monthFormatter.format(new Date(2000, m, 1)),
      })),
    [monthFormatter]
  )
  const fromYear = (fromDate ?? new Date(endDate.getFullYear() - 100, 0, 1)).getFullYear()
  const toYear = endDate.getFullYear()
  const years = React.useMemo(
    () =>
      Array.from({ length: toYear - fromYear + 1 }, (_, i) => toYear - i),
    [fromYear, toYear]
  )

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            buttonClassName,
          )}
        >
          <CalendarIcon className="size-4 shrink-0" />
          <span className="truncate">
            {value ? format(value, "dd/MM/yyyy", { locale: vi }) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-auto p-0", className)} align="start">
        {isDropdown && (
          <div className="flex gap-2 border-b p-3">
            <Select
              value={String(month.getMonth())}
              onValueChange={(v) =>
                setMonth(new Date(month.getFullYear(), Number(v), 1))
              }
            >
              <SelectTrigger className="h-9 flex-1">
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
              value={String(month.getFullYear())}
              onValueChange={(v) =>
                setMonth(new Date(Number(v), month.getMonth(), 1))
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
        )}
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          disabled={disabledDays}
          month={isDropdown ? month : undefined}
          onMonthChange={isDropdown ? setMonth : undefined}
          hideNavigation={isDropdown}
          classNames={isDropdown ? { month_caption: "hidden" } : undefined}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
