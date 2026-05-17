"use client"

import * as React from "react"
import Link from "next/link"
import {
  addDays,
  addMonths,
  differenceInMinutes,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
import { vi } from "date-fns/locale"
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  List,
  Loader2,
  RefreshCw,
  User,
} from "lucide-react"

import { AuthGuard } from "@/components/auth/auth-guard"
import { SiteLayout } from "@/components/layout/site-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useWorkerBookingSchedule } from "@/lib/hooks/use-bookings"
import { cn } from "@/lib/utils"
import { BookingStatus, type Booking } from "@/types/booking"

import {
  bookingStatusBadgeClass,
  bookingStatusLabel,
  getBookingId,
  getClientName,
  getServiceLabel,
  isBookingExpired,
} from "../format"

const WEEK_STARTS_ON = 1
const WEEKDAY_LABELS = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "CN",
]

const toDateKey = (date: Date) => format(date, "yyyy-MM-dd")

const parseBookingDate = (value: string) => {
  const date = parseISO(value)
  return Number.isNaN(date.getTime()) ? new Date(value) : date
}

const formatTime = (value: string) => {
  const date = parseBookingDate(value)
  if (Number.isNaN(date.getTime())) return "--:--"
  return format(date, "HH:mm")
}

const formatDuration = (booking: Booking) => {
  const start = parseBookingDate(booking.schedule.start_time)
  const end = parseBookingDate(booking.schedule.end_time)
  const minutes = differenceInMinutes(end, start)

  if (Number.isFinite(minutes) && minutes > 0) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (hours > 0 && remainingMinutes > 0) {
      return `${hours}h ${remainingMinutes}m`
    }
    if (hours > 0) return `${hours}h`
    return `${remainingMinutes}m`
  }

  return `${booking.schedule.duration_hours}h`
}

const getDisplayStatus = (booking: Booking) =>
  isBookingExpired(booking.schedule, booking.status, booking.created_at)
    ? BookingStatus.EXPIRED
    : booking.status

const buildCalendarDays = (month: Date) => {
  const firstDay = startOfWeek(startOfMonth(month), {
    weekStartsOn: WEEK_STARTS_ON,
  })
  const lastDay = endOfWeek(endOfMonth(month), {
    weekStartsOn: WEEK_STARTS_ON,
  })
  const days: Date[] = []

  for (let day = firstDay; day <= lastDay; day = addDays(day, 1)) {
    days.push(day)
  }

  return days
}

function BookingPill({
  booking,
  compact = false,
}: {
  booking: Booking
  compact?: boolean
}) {
  const displayStatus = getDisplayStatus(booking)

  return (
    <Link
      href="/worker/bookings"
      className={cn(
        "block rounded-md border px-2.5 py-2 text-left transition hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        bookingStatusBadgeClass[displayStatus]
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold">
          {formatTime(booking.schedule.start_time)}
        </span>
        <span className="shrink-0 text-[11px] opacity-80">
          {formatDuration(booking)}
        </span>
      </div>
      <div className="mt-1 truncate text-xs font-medium">
        {getServiceLabel(booking)}
      </div>
      {compact ? null : (
        <div className="mt-1 flex items-center gap-1 truncate text-[11px] opacity-80">
          <User className="size-3 shrink-0" />
          <span className="truncate">{getClientName(booking.client_id)}</span>
        </div>
      )}
    </Link>
  )
}

export default function WorkerBookingSchedulePage() {
  const [month, setMonth] = React.useState(() => startOfMonth(new Date()))

  const calendarDays = React.useMemo(() => buildCalendarDays(month), [month])
  const range = React.useMemo(
    () => ({
      start_date: toDateKey(startOfMonth(month)),
      end_date: toDateKey(endOfMonth(month)),
    }),
    [month]
  )

  const bookingsQuery = useWorkerBookingSchedule(range)
  const bookings = React.useMemo(
    () =>
      [...(bookingsQuery.data ?? [])].sort(
        (a, b) =>
          parseBookingDate(a.schedule.start_time).getTime() -
          parseBookingDate(b.schedule.start_time).getTime()
      ),
    [bookingsQuery.data]
  )

  const bookingsByDay = React.useMemo(() => {
    const grouped = new Map<string, Booking[]>()

    for (const booking of bookings) {
      const key = toDateKey(parseBookingDate(booking.schedule.start_time))
      const group = grouped.get(key)
      if (group) {
        group.push(booking)
      } else {
        grouped.set(key, [booking])
      }
    }

    return grouped
  }, [bookings])

  const monthBookings = React.useMemo(
    () =>
      bookings.filter((booking) =>
        isSameMonth(parseBookingDate(booking.schedule.start_time), month)
      ),
    [bookings, month]
  )

  const todayBookings = bookingsByDay.get(toDateKey(new Date())) ?? []
  const activeBookings = monthBookings.filter((booking) => {
    const status = getDisplayStatus(booking)
    return (
      status === BookingStatus.PENDING ||
      status === BookingStatus.CONFIRMED ||
      status === BookingStatus.IN_PROGRESS ||
      status === BookingStatus.PENDING_CLIENT_ACCEPTANCE
    )
  })

  return (
    <SiteLayout>
      <AuthGuard>
        <div className="flex min-h-[calc(100svh-3.5rem)] flex-col bg-muted/20">
          <div className="border-b bg-background">
            <div className="container mx-auto flex flex-col gap-4 px-4 py-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight md:text-3xl">
                  <CalendarDays className="size-7" />
                  Lịch booking worker
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {format(month, "MMMM yyyy", { locale: vi })} ·{" "}
                  {range.start_date} đến {range.end_date}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/worker/bookings">
                    <List className="size-4" />
                    Danh sách
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Tháng trước"
                  onClick={() => setMonth((value) => subMonths(value, 1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMonth(startOfMonth(new Date()))}
                >
                  Hôm nay
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Tháng sau"
                  onClick={() => setMonth((value) => addMonths(value, 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => bookingsQuery.refetch()}
                  disabled={bookingsQuery.isFetching}
                >
                  {bookingsQuery.isFetching ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Làm mới
                </Button>
              </div>
            </div>
          </div>

          <div className="container mx-auto grid gap-4 px-4 py-4 md:grid-cols-3">
            <div className="rounded-md border bg-background px-4 py-3">
              <div className="text-sm text-muted-foreground">
                Booking trong tháng
              </div>
              <div className="mt-1 text-2xl font-semibold">
                {monthBookings.length}
              </div>
            </div>
            <div className="rounded-md border bg-background px-4 py-3">
              <div className="text-sm text-muted-foreground">
                Đang cần xử lý
              </div>
              <div className="mt-1 text-2xl font-semibold">
                {activeBookings.length}
              </div>
            </div>
            <div className="rounded-md border bg-background px-4 py-3">
              <div className="text-sm text-muted-foreground">Hôm nay</div>
              <div className="mt-1 text-2xl font-semibold">
                {todayBookings.length}
              </div>
            </div>
          </div>

          <div className="container mx-auto flex flex-1 flex-col px-4 pb-6">
            {bookingsQuery.isLoading ? (
              <div className="flex min-h-[420px] flex-1 items-center justify-center rounded-md border bg-background">
                <Loader2 className="size-9 animate-spin text-muted-foreground" />
              </div>
            ) : bookingsQuery.isError ? (
              <div className="flex min-h-[420px] flex-1 flex-col items-center justify-center gap-3 rounded-md border bg-background px-4 text-center">
                <AlertCircle className="size-10 text-red-600 dark:text-red-400" />
                <div>
                  <p className="font-medium">Không tải được lịch booking</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Vui lòng thử lại hoặc kiểm tra kết nối API.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => bookingsQuery.refetch()}
                >
                  Thử lại
                </Button>
              </div>
            ) : (
              <>
                <div className="hidden flex-1 overflow-hidden rounded-md border bg-background lg:flex lg:flex-col">
                  <div className="grid grid-cols-7 border-b bg-muted/40">
                    {WEEKDAY_LABELS.map((label) => (
                      <div
                        key={label}
                        className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase"
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                  <div className="grid flex-1 auto-rows-fr grid-cols-7">
                    {calendarDays.map((day) => {
                      const key = toDateKey(day)
                      const dayBookings = bookingsByDay.get(key) ?? []
                      const visibleBookings = dayBookings.slice(0, 3)
                      const hiddenCount =
                        dayBookings.length - visibleBookings.length

                      return (
                        <div
                          key={key}
                          className={cn(
                            "min-h-36 border-r border-b p-2 last:border-r-0",
                            !isSameMonth(day, month) &&
                              "bg-muted/30 text-muted-foreground"
                          )}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span
                              className={cn(
                                "flex size-7 items-center justify-center rounded-full text-sm font-medium",
                                isToday(day) &&
                                  "bg-primary text-primary-foreground"
                              )}
                            >
                              {format(day, "d")}
                            </span>
                            {dayBookings.length > 0 ? (
                              <Badge variant="outline">
                                {dayBookings.length}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="space-y-1.5">
                            {visibleBookings.map((booking) => (
                              <BookingPill
                                key={getBookingId(booking)}
                                booking={booking}
                              />
                            ))}
                            {hiddenCount > 0 ? (
                              <div className="rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground">
                                +{hiddenCount} booking khác
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-3 lg:hidden">
                  {monthBookings.length === 0 ? (
                    <div className="flex min-h-64 flex-col items-center justify-center rounded-md border bg-background px-4 text-center">
                      <CalendarDays className="size-10 text-muted-foreground" />
                      <p className="mt-3 text-sm font-medium">
                        Chưa có booking trong tháng này
                      </p>
                    </div>
                  ) : (
                    calendarDays.map((day) => {
                      if (!isSameMonth(day, month)) return null
                      const key = toDateKey(day)
                      const dayBookings = bookingsByDay.get(key) ?? []
                      if (dayBookings.length === 0) return null

                      return (
                        <section
                          key={key}
                          className="rounded-md border bg-background p-3"
                        >
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <h2 className="font-medium">
                                {format(day, "EEEE, dd/MM", { locale: vi })}
                              </h2>
                              <p className="text-xs text-muted-foreground">
                                {dayBookings.length} booking
                              </p>
                            </div>
                            {isToday(day) ? <Badge>Hôm nay</Badge> : null}
                          </div>
                          <div className="space-y-2">
                            {dayBookings.map((booking) => (
                              <div
                                key={getBookingId(booking)}
                                className="rounded-md border p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="truncate font-medium">
                                      {getServiceLabel(booking)}
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                                      <Clock3 className="size-4" />
                                      {formatTime(
                                        booking.schedule.start_time
                                      )}{" "}
                                      - {formatTime(booking.schedule.end_time)}
                                    </div>
                                  </div>
                                  <span
                                    className={cn(
                                      "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
                                      bookingStatusBadgeClass[
                                        getDisplayStatus(booking)
                                      ]
                                    )}
                                  >
                                    {
                                      bookingStatusLabel[
                                        getDisplayStatus(booking)
                                      ]
                                    }
                                  </span>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                                  <User className="size-4" />
                                  <span className="truncate">
                                    {getClientName(booking.client_id)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      )
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </AuthGuard>
    </SiteLayout>
  )
}
