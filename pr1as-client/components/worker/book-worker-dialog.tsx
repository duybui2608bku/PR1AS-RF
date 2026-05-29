"use client"

import { CalendarIcon, Loader2 } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useCreateBooking } from "@/lib/hooks/use-bookings"
import { useWorkerSchedule } from "@/lib/hooks/use-worker"
import { cn } from "@/lib/utils"
import type { WorkerPricingUnit, WorkerServiceItem } from "@/types"

const MIN_ADVANCE_HOURS = 2
const DATE_RANGE_DAYS = 30
const WEEKDAY_VI_LONG = [
  "Chủ nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
]

const UNIT_LABEL: Record<WorkerPricingUnit, string> = {
  HOURLY: "giờ",
  DAILY: "ngày",
  MONTHLY: "tháng",
}

const HOURS_PER_UNIT: Record<WorkerPricingUnit, number> = {
  HOURLY: 1,
  DAILY: 24,
  MONTHLY: 24 * 30,
}

const toIsoDate = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const startOfDay = (date: Date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1)

const formatDateLabel = (date: Date) => {
  const dd = String(date.getDate()).padStart(2, "0")
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const yyyy = date.getFullYear()
  return `${WEEKDAY_VI_LONG[date.getDay()]}, ${dd}/${mm}/${yyyy}`
}

const computeBookedDays = (
  schedule: Array<{ start_time: string; end_time: string }>,
): Date[] => {
  const map = new Map<string, Date>()
  for (const item of schedule) {
    const start = startOfDay(new Date(item.start_time))
    const end = new Date(item.end_time)
    const cursor = new Date(start)
    while (cursor <= end) {
      const key = toIsoDate(cursor)
      if (!map.has(key)) map.set(key, new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
  }
  return [...map.values()]
}

const HOUR_OPTIONS = Array.from({ length: 16 }, (_, i) => {
  const hour = 6 + i
  const label = `${String(hour).padStart(2, "0")}:00`
  return { value: label, label }
})

const formatPrice = (price: number, currency: string): string => {
  const formatted =
    currency === "VND"
      ? new Intl.NumberFormat("vi-VN").format(price)
      : new Intl.NumberFormat("en-US").format(price)
  return currency === "USD" ? `$${formatted}` : `${formatted}đ`
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workerId: string
  workerName: string
  service: WorkerServiceItem | null
  serviceName: string
}

export function BookWorkerDialog({
  open,
  onOpenChange,
  workerId,
  workerName,
  service,
  serviceName,
}: Props) {
  const createBooking = useCreateBooking()

  const availableUnits = useMemo<WorkerPricingUnit[]>(() => {
    if (!service) return []
    const set = new Set<WorkerPricingUnit>()
    for (const p of service.pricing) set.add(p.unit)
    return [...set]
  }, [service])

  const [selectedUnit, setSelectedUnit] = useState<WorkerPricingUnit | "">("")
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState<string>("09:00")
  const [quantity, setQuantity] = useState<number>(1)
  const [notes, setNotes] = useState("")
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [now, setNow] = useState(0)
  const [calendarMonth, setCalendarMonth] = useState<Date>(() =>
    startOfMonth(new Date()),
  )
  const [bookingAnchorMs, setBookingAnchorMs] = useState<number | null>(null)

  const unit =
    selectedUnit && availableUnits.includes(selectedUnit)
      ? selectedUnit
      : availableUnits[0] ?? ""

  const resetForm = () => {
    setSelectedUnit("")
    setDate(undefined)
    setTime("09:00")
    setQuantity(1)
    setNotes("")
    setDatePopoverOpen(false)
    setNow(Date.now())
    setCalendarMonth(startOfMonth(new Date()))
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm()
    onOpenChange(nextOpen)
  }

  const fetchRange = useMemo(() => {
    const today = startOfDay(new Date())
    const end = new Date(today)
    end.setDate(end.getDate() + DATE_RANGE_DAYS)
    return {
      start_date: toIsoDate(today),
      end_date: toIsoDate(end),
    }
  }, [])

  const { data: schedule } = useWorkerSchedule(
    open ? workerId : undefined,
    fetchRange,
  )

  const bookedDays = useMemo(() => {
    const items: Array<{ start_time: string; end_time: string }> = [
      ...(schedule?.bookings ?? []),
      ...(schedule?.blackouts ?? []),
    ]
    return computeBookedDays(items)
  }, [schedule])

  const maxDate = useMemo(() => {
    const d = startOfDay(new Date())
    d.setDate(d.getDate() + DATE_RANGE_DAYS)
    return d
  }, [])

  const startDateTime = useMemo(() => {
    if (!date) return null
    const [hh, mi] = time.split(":").map((p) => parseInt(p, 10))
    const dt = new Date(date)
    dt.setHours(hh, mi, 0, 0)
    return dt
  }, [date, time])

  const endDateTime = useMemo(() => {
    if (!startDateTime || !unit) return null
    const hours = HOURS_PER_UNIT[unit] * quantity
    return new Date(startDateTime.getTime() + hours * 60 * 60 * 1000)
  }, [startDateTime, unit, quantity])

  const unitPricing = useMemo(() => {
    if (!service || !unit) return null
    return service.pricing.find((p) => p.unit === unit) ?? null
  }, [service, unit])

  const totalPrice = useMemo(() => {
    if (!unitPricing) return null
    return {
      amount: unitPricing.price * quantity,
      currency: unitPricing.currency,
      unitAmount: unitPricing.price,
    }
  }, [unitPricing, quantity])

  const validationError = useMemo(() => {
    if (!open) return null
    if (!service) return "Vui lòng chọn dịch vụ"
    if (!unit) return "Vui lòng chọn hình thức"
    if (!date) return "Vui lòng chọn ngày"
    if (quantity < 1) return "Số lượng tối thiểu là 1"
    if (!startDateTime) return "Vui lòng chọn giờ bắt đầu"

    const minStart = new Date(now + MIN_ADVANCE_HOURS * 60 * 60 * 1000)
    if (startDateTime < minStart) {
      return `Lịch phải đặt trước ít nhất ${MIN_ADVANCE_HOURS} giờ`
    }
    return null
  }, [service, unit, date, quantity, startDateTime, now])

  const handleSubmit = async () => {
    if (
      !service ||
      !unit ||
      !startDateTime ||
      !endDateTime ||
      validationError
    ) {
      return
    }

    try {
      await createBooking.mutateAsync({
        worker_id: workerId,
        worker_service_id: service._id,
        service_id: service.service_id,
        service_code: service.service_code,
        schedule: {
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
        },
        pricing: {
          unit,
          quantity,
        },
        client_notes: notes.trim() || undefined,
      })
      resetForm()
      onOpenChange(false)
    } catch {
      
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Thuê {workerName}</DialogTitle>
          <DialogDescription>{serviceName}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="book-unit">Hình thức</Label>
            <Select
              value={unit}
              onValueChange={(v) => setSelectedUnit(v as WorkerPricingUnit)}
              disabled={availableUnits.length === 0}
            >
              <SelectTrigger id="book-unit" className="w-full">
                <SelectValue placeholder="Chọn hình thức thuê" />
              </SelectTrigger>
              <SelectContent>
                {availableUnits.map((u) => (
                  <SelectItem key={u} value={u}>
                    Theo {UNIT_LABEL[u]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="book-date">Ngày</Label>
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="book-date"
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start font-normal",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="size-4 shrink-0" />
                    <span className="truncate">
                      {date ? formatDateLabel(date) : "Chọn ngày"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      setNow(Date.now())
                      setDate(d)
                      if (d) setDatePopoverOpen(false)
                    }}
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    disabled={[
                      { before: startOfDay(new Date()) },
                      { after: maxDate },
                      ...bookedDays,
                    ]}
                    modifiers={{ booked: bookedDays }}
                    modifiersClassNames={{
                      booked:
                        "[&>button]:border [&>button]:border-rose-300 [&>button]:text-rose-500 dark:[&>button]:border-rose-800 dark:[&>button]:text-rose-400 [&>button]:cursor-not-allowed",
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="book-time">Giờ bắt đầu</Label>
              <Select
                value={time}
                onValueChange={(value) => {
                  setNow(Date.now())
                  setTime(value)
                }}
              >
                <SelectTrigger id="book-time" className="w-full">
                  <SelectValue placeholder="Chọn giờ" />
                </SelectTrigger>
                <SelectContent>
                  {HOUR_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="book-quantity">
              Số lượng ({unit ? UNIT_LABEL[unit] : "đơn vị"})
            </Label>
            <Input
              id="book-quantity"
              type="number"
              min={1}
              max={1000}
              value={quantity}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10)
                setQuantity(Number.isFinite(v) && v > 0 ? v : 1)
              }}
            />
            {endDateTime ? (
              <p className="text-xs text-muted-foreground">
                Kết thúc dự kiến:{" "}
                {endDateTime.toLocaleString("vi-VN", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="book-notes">Ghi chú (tùy chọn)</Label>
            <Textarea
              id="book-notes"
              rows={3}
              maxLength={1000}
              placeholder="Yêu cầu thêm cho worker"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {totalPrice ? (
            <div className="rounded-lg border bg-muted/50 px-4 py-3 text-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Đơn giá ({UNIT_LABEL[unit as WorkerPricingUnit]})</span>
                <span>{formatPrice(totalPrice.unitAmount, totalPrice.currency)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-muted-foreground">
                <span>Số lượng</span>
                <span>× {quantity}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t pt-2 font-semibold text-foreground">
                <span>Tổng cộng</span>
                <span className="text-primary">
                  {formatPrice(totalPrice.amount, totalPrice.currency)}
                </span>
              </div>
            </div>
          ) : null}

          {validationError ? (
            <p className="text-sm text-destructive">{validationError}</p>
          ) : null}
        </div>

        <DialogFooter className="w-full flex-row gap-2 sm:space-x-0">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleOpenChange(false)}
            disabled={createBooking.isPending}
          >
            Hủy
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={!!validationError || createBooking.isPending}
          >
            {createBooking.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Xác nhận đặt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
