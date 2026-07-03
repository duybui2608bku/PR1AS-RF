"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"

import { Calendar } from "@/components/ui/calendar"
import {
  classifyDays,
  computeBookedIntervals,
} from "@/lib/booking-availability"
import { useWorkerSchedule } from "@/lib/hooks/use-worker"

const DATE_RANGE_DAYS = 30

// Mirror BookWorkerDialog's start-time window so "fully booked" is judged
// against the same slots the booking form actually offers.
const BOOKABLE_HOURS = Array.from(
  { length: 16 },
  (_, i) => `${String(6 + i).padStart(2, "0")}:00`,
)

const toIsoDate = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1)

const endOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0)

const startOfDay = (date: Date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

type Props = {
  workerId: string
  selected?: Date
  onSelect?: (date?: Date) => void
}

export function WorkerCalendar({ workerId, selected, onSelect }: Props) {
  const t = useTranslations("WorkerProfile")
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()))

  const range = useMemo(
    () => ({
      start_date: toIsoDate(startOfMonth(month)),
      end_date: toIsoDate(endOfMonth(month)),
    }),
    [month],
  )

  const { data: schedule, isLoading } = useWorkerSchedule(workerId, range)

  // Mirror the booking form's window: only allow dates within the next
  // DATE_RANGE_DAYS so a calendar selection is always valid in the dialog.
  const maxDate = useMemo(() => {
    const d = startOfDay(new Date())
    d.setDate(d.getDate() + DATE_RANGE_DAYS)
    return d
  }, [])

  const { fullyBooked, partiallyBooked } = useMemo(() => {
    const intervals = computeBookedIntervals([
      ...(schedule?.bookings ?? []),
      ...(schedule?.blackouts ?? []),
    ])
    return classifyDays(
      startOfMonth(month),
      endOfMonth(month),
      BOOKABLE_HOURS,
      intervals,
    )
  }, [schedule, month])

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <Calendar
        mode="single"
        selected={selected}
        onSelect={onSelect}
        month={month}
        onMonthChange={setMonth}
        captionLayout="dropdown"
        startMonth={startOfMonth(new Date())}
        endMonth={maxDate}
        disabled={[
          { before: startOfDay(new Date()) },
          { after: maxDate },
          ...fullyBooked,
        ]}
        modifiers={{ booked: fullyBooked, partial: partiallyBooked }}
        modifiersClassNames={{
          booked:
            "border border-rose-300 text-rose-500 dark:border-rose-800 dark:text-rose-400 rounded-md opacity-100",
          partial:
            "border border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400 rounded-md",
        }}
        classNames={{
          week: "mt-2 flex w-full gap-1",
        }}
        className="mx-auto"
      />
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 border-t px-3 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-3 shrink-0 rounded-[4px] border border-border bg-background"
          />
          {t("calendar.legendAvailable")}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-3 shrink-0 rounded-[4px] border border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400"
          />
          {t("calendar.legendPartial")}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-3 shrink-0 rounded-[4px] border border-rose-300 text-rose-500 dark:border-rose-800 dark:text-rose-400"
          />
          {t("calendar.legendUnavailable")}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-3 shrink-0 rounded-[4px] border border-border bg-muted opacity-50"
          />
          {t("calendar.legendOutOfRange")}
        </span>
      </div>
      {isLoading ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {t("calendar.loading")}
        </p>
      ) : null}
    </div>
  )
}
