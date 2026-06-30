"use client"

import * as React from "react"
import { format, type Locale } from "date-fns"
import { enUS, ko, vi, zhCN } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { useLocale } from "next-intl"

import { Button } from "@/components/ui/button"
import { Calendar, type CalendarProps } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
  /** Extra day matchers to disable on top of the from/to range. */
  disabledMatchers?: CalendarProps["disabled"]
  /** Show month/year dropdowns — handy for far-back dates like birthdays. */
  captionLayout?: CalendarProps["captionLayout"]
}

const DATE_FNS_LOCALES: Record<string, Locale> = {
  vi,
  en: enUS,
  zh: zhCN,
  ko,
}

const PLACEHOLDERS: Record<string, string> = {
  vi: "Chọn ngày",
  en: "Select date",
  zh: "选择日期",
  ko: "날짜 선택",
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  buttonClassName,
  fromDate,
  toDate,
  disabledMatchers,
  captionLayout,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const appLocale = useLocale()
  const dateLocale = DATE_FNS_LOCALES[appLocale] ?? vi
  const resolvedPlaceholder = placeholder ?? PLACEHOLDERS[appLocale] ?? PLACEHOLDERS.vi

  const extraMatchers = disabledMatchers
    ? Array.isArray(disabledMatchers)
      ? disabledMatchers
      : [disabledMatchers]
    : []
  const matchers = [
    ...(fromDate ? [{ before: fromDate }] : []),
    ...(toDate ? [{ after: toDate }] : []),
    ...extraMatchers,
  ]
  const disabledDays: CalendarProps["disabled"] =
    matchers.length > 0 ? matchers : undefined

  const handleSelect = (date: Date | undefined) => {
    onChange?.(date)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
            {value ? format(value, "dd/MM/yyyy", { locale: dateLocale }) : resolvedPlaceholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-auto p-0", className)} align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          disabled={disabledDays}
          captionLayout={captionLayout}
          defaultMonth={value ?? toDate}
          startMonth={fromDate}
          endMonth={toDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
