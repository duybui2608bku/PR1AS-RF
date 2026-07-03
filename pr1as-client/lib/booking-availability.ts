import type { WorkerPricingUnit } from "@/types"

/** Hours each pricing unit spans, used to derive a booking's end time. */
export const HOURS_PER_UNIT: Record<WorkerPricingUnit, number> = {
  HOURLY: 1,
  DAILY: 24,
  MONTHLY: 24 * 30,
}

const HOUR_MS = 60 * 60 * 1000

export type ScheduleInterval = { start_time: string; end_time: string }

/** A booked time range expressed in epoch milliseconds. */
export type BookedInterval = { start: number; end: number }

/**
 * Turn raw schedule items (bookings + blackouts) into sorted, valid time
 * intervals. Unlike the old day-level logic this keeps the exact start/end so a
 * partial-day booking only blocks its own hours, not the whole day.
 */
export const computeBookedIntervals = (
  schedule: ScheduleInterval[],
): BookedInterval[] => {
  const intervals: BookedInterval[] = []
  for (const item of schedule) {
    const start = new Date(item.start_time).getTime()
    const end = new Date(item.end_time).getTime()
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      intervals.push({ start, end })
    }
  }
  return intervals.sort((a, b) => a.start - b.start)
}

/** Half-open overlap check — mirrors the backend `checkScheduleConflict`. */
export const rangeHasConflict = (
  startMs: number,
  endMs: number,
  booked: BookedInterval[],
): boolean => booked.some((b) => startMs < b.end && endMs > b.start)

const hourToMs = (date: Date, hhmm: string): number => {
  const [hh, mm] = hhmm.split(":").map((part) => Number.parseInt(part, 10))
  const dt = new Date(date)
  dt.setHours(hh, Number.isFinite(mm) ? mm : 0, 0, 0)
  return dt.getTime()
}

/**
 * Hour options whose resulting booking `[start, start + durationHours)` would
 * overlap an existing booking on the given day. These are the start times the
 * client should not be able to pick.
 */
export const computeBlockedHours = (
  date: Date,
  hourOptions: string[],
  durationHours: number,
  booked: BookedInterval[],
): Set<string> => {
  const blocked = new Set<string>()
  if (booked.length === 0) return blocked
  const durationMs = Math.max(durationHours, 0) * HOUR_MS
  for (const opt of hourOptions) {
    const startMs = hourToMs(date, opt)
    if (rangeHasConflict(startMs, startMs + durationMs, booked)) {
      blocked.add(opt)
    }
  }
  return blocked
}

export type DayAvailability = {
  /** Days with no free 1-hour slot — keep these disabled in the calendar. */
  fullyBooked: Date[]
  /** Days with at least one booking but still some free slots — selectable. */
  partiallyBooked: Date[]
}

/**
 * Classify every day in `[rangeStart, rangeEnd]` as fully or partially booked,
 * probing with a 1-hour slot so it stays unit/quantity-independent (the profile
 * calendar has no pricing unit chosen yet). Only fully-booked days should be
 * disabled; partially-booked days stay open so other clients can grab the free
 * hours.
 */
export const classifyDays = (
  rangeStart: Date,
  rangeEnd: Date,
  hourOptions: string[],
  booked: BookedInterval[],
): DayAvailability => {
  const fullyBooked: Date[] = []
  const partiallyBooked: Date[] = []
  if (booked.length === 0 || hourOptions.length === 0) {
    return { fullyBooked, partiallyBooked }
  }
  const cursor = new Date(rangeStart)
  cursor.setHours(0, 0, 0, 0)
  const last = new Date(rangeEnd)
  last.setHours(0, 0, 0, 0)
  while (cursor <= last) {
    const blockedCount = computeBlockedHours(cursor, hourOptions, 1, booked).size
    if (blockedCount === hourOptions.length) {
      fullyBooked.push(new Date(cursor))
    } else if (blockedCount > 0) {
      partiallyBooked.push(new Date(cursor))
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return { fullyBooked, partiallyBooked }
}
