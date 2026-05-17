"use client"

import { useMemo, useState } from "react"

import { Calendar } from "@/components/ui/calendar"
import { useWorkerSchedule } from "@/lib/hooks/use-worker"

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
}

export function WorkerCalendar({ workerId }: Props) {
  const [month, setMonth] = useState<Date>(() => startOfMonth(new Date()))

  const range = useMemo(
    () => ({
      start_date: toIsoDate(startOfMonth(month)),
      end_date: toIsoDate(endOfMonth(month)),
    }),
    [month],
  )

  const { data: schedule, isLoading } = useWorkerSchedule(workerId, range)

  const bookedDays = useMemo(
    () => computeBookedDays(schedule ?? []),
    [schedule],
  )

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <Calendar
        mode="single"
        month={month}
        onMonthChange={setMonth}
        disabled={[{ before: startOfDay(new Date()) }, ...bookedDays]}
        modifiers={{ booked: bookedDays }}
        modifiersClassNames={{
          booked:
            "border border-rose-300 text-rose-500 dark:border-rose-800 dark:text-rose-400 rounded-md opacity-100",
        }}
        className="mx-auto"
      />
      {isLoading ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Đang tải lịch...
        </p>
      ) : null}
    </div>
  )
}
