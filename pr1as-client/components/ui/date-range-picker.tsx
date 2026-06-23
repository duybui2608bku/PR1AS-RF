"use client"

import { format, type Locale } from "date-fns"
import { enUS, ko, vi, zhCN } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { useLocale } from "next-intl"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar, type CalendarProps } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type DateRangePickerProps = {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  buttonClassName?: string
  numberOfMonths?: number
  fromDate?: Date
  toDate?: Date
  align?: "start" | "center" | "end"
  id?: string
}

const DATE_FNS_LOCALES: Record<string, Locale> = {
  vi,
  en: enUS,
  zh: zhCN,
  ko,
}

const PLACEHOLDERS: Record<string, string> = {
  vi: "Chọn khoảng ngày",
  en: "Select date range",
  zh: "选择日期范围",
  ko: "날짜 범위 선택",
}

export function DateRangePicker({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  buttonClassName,
  numberOfMonths = 2,
  fromDate,
  toDate,
  align = "start",
  id,
}: DateRangePickerProps) {
  const appLocale = useLocale()
  const dateLocale = DATE_FNS_LOCALES[appLocale] ?? vi
  const resolvedPlaceholder = placeholder ?? PLACEHOLDERS[appLocale] ?? PLACEHOLDERS.vi
  const formatDate = (d: Date) => format(d, "dd/MM/yyyy", { locale: dateLocale })

  let disabledDays: CalendarProps["disabled"]
  if (fromDate && toDate) {
    disabledDays = [{ before: fromDate }, { after: toDate }]
  } else if (fromDate) {
    disabledDays = { before: fromDate }
  } else if (toDate) {
    disabledDays = { after: toDate }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          disabled={disabled}
          className={cn(
            "my-0 w-full justify-start font-normal",
            !value?.from && "text-muted-foreground",
            buttonClassName
          )}
        >
          <CalendarIcon />
          {value?.from ? (
            value.to ? (
              <span className="truncate">
                {formatDate(value.from)} – {formatDate(value.to)}
              </span>
            ) : (
              <span className="truncate">{formatDate(value.from)}</span>
            )
          ) : (
            <span>{resolvedPlaceholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-auto p-0 [&_button]:my-0", className)}
        align={align}
      >
        <Calendar
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={onChange}
          disabled={disabledDays}
          numberOfMonths={numberOfMonths}
        />
      </PopoverContent>
    </Popover>
  )
}
