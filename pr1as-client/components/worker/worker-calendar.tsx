"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"

import { Calendar } from "@/components/ui/calendar"
import { useWorkerSchedule } from "@/lib/hooks/use-worker"

const DATE_RANGE_DAYS = 30

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

const computeBookedDays = (
  schedule: Array<{ start_time: string; end_time: string }>,
): Date[] => {
  const days = new Map<string, Date>()
  for (const item of schedule) {
    const start = startOfDay(new Date(item.start_time))
    const end = new Date(item.end_time)
    const cursor = new Date(start)
    while (cursor <= end) {
      const key = toIsoDate(cursor)
      if (!days.has(key)) days.set(key, new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
  }
  return [...days.values()]
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

  const bookedDays = useMemo(() => {
    const items: Array<{ start_time: string; end_time: string }> = [
      ...(schedule?.bookings ?? []),
      ...(schedule?.blackouts ?? []),
    ]
    return computeBookedDays(items)
  }, [schedule])

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
          ...bookedDays,
        ]}
        modifiers={{ booked: bookedDays }}
        modifiersClassNames={{
          booked:
            "border border-rose-300 text-rose-500 dark:border-rose-800 dark:text-rose-400 rounded-md opacity-100",
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
