"use client"

import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
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

const formatDate = (d: Date) => format(d, "dd/MM/yyyy", { locale: vi })

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Chọn khoảng ngày",
  disabled,
  className,
  buttonClassName,
  numberOfMonths = 2,
  fromDate,
  toDate,
  align = "start",
  id,
}: DateRangePickerProps) {
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
            <span>{placeholder}</span>
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
