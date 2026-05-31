"use client"

import * as React from "react"
import { SlidersHorizontal } from "lucide-react"
import type { DateRange } from "react-day-picker"

import {
  BottomSheet,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetTitle,
  BottomSheetTrigger,
} from "@/components/ui/bottom-sheet"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { type BookingStatus } from "@/types/booking"

type StatusOption = { value: "all" | BookingStatus; label: string }

type WorkerBookingsMobileFiltersProps = {
  statusOptions: StatusOption[]
  statusValue: "all" | BookingStatus
  onStatusChange: (value: "all" | BookingStatus) => void
  serviceCode: string
  onServiceCodeChange: (value: string) => void
  dateRange: DateRange | undefined
  onDateRangeChange: (value: DateRange | undefined) => void
  advancedFilterCount: number
  onApply: () => void
  onReset: () => void
}

export function WorkerBookingsMobileFilters({
  statusOptions,
  statusValue,
  onStatusChange,
  serviceCode,
  onServiceCodeChange,
  dateRange,
  onDateRangeChange,
  advancedFilterCount,
  onApply,
  onReset,
}: WorkerBookingsMobileFiltersProps) {
  const [open, setOpen] = React.useState(false)

  const handleApply = () => {
    onApply()
    setOpen(false)
  }

  const handleReset = () => {
    onReset()
    setOpen(false)
  }

  return (
    <div className="-mx-4 flex items-center gap-2 px-4">
      <BottomSheet open={open} onOpenChange={setOpen}>
        <BottomSheetTrigger asChild>
          <button
            type="button"
            aria-label="Bộ lọc nâng cao"
            className="relative flex size-10 shrink-0 items-center justify-center rounded-full border bg-card text-foreground transition-colors active:scale-95"
          >
            <SlidersHorizontal className="size-4" />
            {advancedFilterCount > 0 ? (
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {advancedFilterCount}
              </span>
            ) : null}
          </button>
        </BottomSheetTrigger>
        <BottomSheetContent
          aria-describedby={undefined}
          className="pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        >
          <div className="px-5 pb-3 text-center">
            <BottomSheetTitle>Bộ lọc nâng cao</BottomSheetTitle>
          </div>
          <div className="grid gap-4 px-5">
            <div className="grid gap-2">
              <Label htmlFor="worker-mobile-filter-service">Mã dịch vụ</Label>
              <Input
                id="worker-mobile-filter-service"
                value={serviceCode}
                maxLength={40}
                placeholder="VD: CLEANING"
                onChange={(event) => onServiceCodeChange(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Khoảng ngày</Label>
              <DateRangePicker
                value={dateRange}
                onChange={onDateRangeChange}
                numberOfMonths={1}
                align="start"
              />
            </div>
          </div>
          <div className="mt-5 flex gap-2 px-5">
            <Button variant="outline" className="flex-1" onClick={handleReset}>
              Đặt lại
            </Button>
            <Button className="flex-1" onClick={handleApply}>
              Áp dụng
            </Button>
          </div>
          <BottomSheetClose className="sr-only">Đóng</BottomSheetClose>
        </BottomSheetContent>
      </BottomSheet>

      <div className="-mr-4 flex flex-1 gap-2 overflow-x-auto pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {statusOptions.map((option) => {
          const active = option.value === statusValue
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onStatusChange(option.value)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors active:scale-95",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-accent"
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
