"use client"

import * as React from "react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

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
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
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
            {value ? format(value, "dd/MM/yyyy", { locale: vi }) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-auto p-0", className)} align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          disabled={disabledDays}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
