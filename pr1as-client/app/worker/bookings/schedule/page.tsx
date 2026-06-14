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
  type Locale,
} from "date-fns"
import { enUS, vi, zhCN } from "date-fns/locale"
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
import { useLocale, useTranslations } from "next-intl"

import { AuthGuard } from "@/components/auth/auth-guard"
import { SiteLayout } from "@/components/layout/site-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkerBlackoutManager } from "@/components/worker/worker-blackout-manager"
import { useWorkerBookingSchedule } from "@/lib/hooks/use-bookings"
import { type SupportedLocale } from "@/lib/locale"
import { cn } from "@/lib/utils"
import { BookingStatus, type Booking } from "@/types/booking"

import {
  bookingStatusBadgeClass,
  getBookingId,
  getClientName,
  getServiceLabel,
  isBookingExpired,
} from "../format"

const WEEK_STARTS_ON = 1
const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const

const DATE_FNS_LOCALES: Record<SupportedLocale, Locale> = {
  vi,
  en: enUS,
  zh: zhCN,
}

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

const formatDuration = (
  booking: Booking,
  units: { hour: string; minute: string }
) => {
  const start = parseBookingDate(booking.schedule.start_time)
  const end = parseBookingDate(booking.schedule.end_time)
  const minutes = differenceInMinutes(end, start)

  if (Number.isFinite(minutes) && minutes > 0) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (hours > 0 && remainingMinutes > 0) {
      return `${hours}${units.hour} ${remainingMinutes}${units.minute}`
    }
    if (hours > 0) return `${hours}${units.hour}`
    return `${remainingMinutes}${units.minute}`
  }

  return `${booking.schedule.duration_hours}${units.hour}`
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
  locale,
  durationUnits,
  compact = false,
}: {
  booking: Booking
  locale: SupportedLocale
  durationUnits: { hour: string; minute: string }
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
          {formatDuration(booking, durationUnits)}
        </span>
      </div>
      <div className="mt-1 truncate text-xs font-medium">
        {getServiceLabel(booking, locale)}
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
  const t = useTranslations("WorkerBookingSchedule")
  const tStatus = useTranslations("Bookings.statusLabels")
  const locale = useLocale() as SupportedLocale
  const dateFnsLocale = DATE_FNS_LOCALES[locale]
  const durationUnits = React.useMemo(
    () => ({
      hour: t("duration.hourShort"),
      minute: t("duration.minuteShort"),
    }),
    [t]
  )
  const weekdayLabels = React.useMemo(
    () => WEEKDAY_KEYS.map((key) => t(`weekdays.${key}`)),
    [t]
  )
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
    <SiteLayout hideFooter>
      <AuthGuard>
        <Tabs
          defaultValue="bookings"
          className="flex min-h-[calc(100svh-3.5rem)] flex-col bg-muted/20"
        >
          <div className="border-b bg-background">
            <div className="container mx-auto flex flex-col gap-4 px-4 py-5">
              <div className="flex flex-row items-center justify-between gap-3">
                <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight md:text-3xl">
                  <CalendarDays className="size-7" />
                  {t("title")}
                </h1>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="shrink-0"
                >
                  <Link href="/worker/bookings">
                    <List className="size-4" />
                    <span className="hidden sm:inline">{t("bookingList")}</span>
                  </Link>
                </Button>
              </div>
              <TabsList>
                <TabsTrigger value="bookings">{t("tabs.bookings")}</TabsTrigger>
                <TabsTrigger value="blackouts">
                  {t("tabs.blackouts")}
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent
            value="bookings"
            className="flex flex-1 flex-col focus-visible:outline-none"
          >
            <div className="container mx-auto flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("previousMonth")}
                  onClick={() => setMonth((value) => subMonths(value, 1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="flex-1 text-center text-base font-semibold capitalize lg:flex-none lg:px-2 lg:text-lg">
                  {format(month, "MMMM yyyy", { locale: dateFnsLocale })}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t("nextMonth")}
                  onClick={() => setMonth((value) => addMonths(value, 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 lg:flex-none"
                  onClick={() => setMonth(startOfMonth(new Date()))}
                >
                  {t("today")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 lg:flex-none"
                  onClick={() => bookingsQuery.refetch()}
                  disabled={bookingsQuery.isFetching}
                >
                  {bookingsQuery.isFetching ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  {t("refresh")}
                </Button>
              </div>
            </div>

            {/* Mobile: inline stat bar */}
            <div className="container mx-auto px-4 pb-4 md:hidden">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl border bg-card px-3 py-3 text-center shadow-sm">
                  <span className="block text-2xl font-bold tabular-nums">
                    {monthBookings.length}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {t("stats.thisMonth")}
                  </span>
                </div>
                <div className="rounded-2xl border bg-card px-3 py-3 text-center shadow-sm">
                  <span className="block text-2xl font-bold text-amber-600 tabular-nums dark:text-amber-400">
                    {activeBookings.length}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {t("stats.needsAction")}
                  </span>
                </div>
                <div className="rounded-2xl border bg-card px-3 py-3 text-center shadow-sm">
                  <span className="block text-2xl font-bold text-primary tabular-nums">
                    {todayBookings.length}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {t("stats.today")}
                  </span>
                </div>
              </div>
            </div>
            {/* Desktop: 3-card grid */}
            <div className="container mx-auto hidden grid-cols-3 gap-4 px-4 pb-4 md:grid">
              <div className="rounded-md border bg-background px-4 py-3">
                <div className="text-sm text-muted-foreground">
                  {t("stats.monthBookings")}
                </div>
                <div className="mt-1 text-2xl font-semibold">
                  {monthBookings.length}
                </div>
              </div>
              <div className="rounded-md border bg-background px-4 py-3">
                <div className="text-sm text-muted-foreground">
                  {t("stats.activeBookings")}
                </div>
                <div className="mt-1 text-2xl font-semibold">
                  {activeBookings.length}
                </div>
              </div>
              <div className="rounded-md border bg-background px-4 py-3">
                <div className="text-sm text-muted-foreground">
                  {t("stats.today")}
                </div>
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
                    <p className="font-medium">{t("loadErrorTitle")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("loadErrorDescription")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => bookingsQuery.refetch()}
                  >
                    {t("tryAgain")}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="hidden flex-1 overflow-hidden rounded-md border bg-background lg:flex lg:flex-col">
                    <div className="grid grid-cols-7 border-b bg-muted/40">
                      {weekdayLabels.map((label) => (
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
                                  locale={locale}
                                  durationUnits={durationUnits}
                                />
                              ))}
                              {hiddenCount > 0 ? (
                                <div className="rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground">
                                  {t("moreBookings", { count: hiddenCount })}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-4 lg:hidden">
                    {monthBookings.length === 0 ? (
                      <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border bg-card px-4 text-center shadow-sm">
                        <CalendarDays className="size-10 text-muted-foreground" />
                        <p className="mt-3 text-sm font-medium">
                          {t("emptyMonth")}
                        </p>
                      </div>
                    ) : (
                      calendarDays.map((day) => {
                        if (!isSameMonth(day, month)) return null
                        const key = toDateKey(day)
                        const dayBookings = bookingsByDay.get(key) ?? []
                        if (dayBookings.length === 0) return null

                        return (
                          <section key={key}>
                            <div className="mb-2 flex items-center justify-between px-1">
                              <h2 className="text-sm font-semibold capitalize">
                                {format(day, "EEEE, dd/MM", {
                                  locale: dateFnsLocale,
                                })}
                              </h2>
                              {isToday(day) ? (
                                <Badge>{t("today")}</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {t("bookingCount", {
                                    count: dayBookings.length,
                                  })}
                                </span>
                              )}
                            </div>
                            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                              {dayBookings.map((booking, index) => (
                                <Link
                                  key={getBookingId(booking)}
                                  href="/worker/bookings"
                                  className={cn(
                                    "flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-accent active:bg-accent/70",
                                    index < dayBookings.length - 1 && "border-b"
                                  )}
                                >
                                  <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-muted py-1.5">
                                    <span className="text-sm font-semibold tabular-nums">
                                      {formatTime(booking.schedule.start_time)}
                                    </span>
                                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                      <Clock3 className="size-2.5" />
                                      {formatDuration(booking, durationUnits)}
                                    </span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium">
                                      {getServiceLabel(booking, locale)}
                                    </div>
                                    <div className="mt-1 flex items-center gap-2">
                                      <span
                                        className={cn(
                                          "inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                          bookingStatusBadgeClass[
                                            getDisplayStatus(booking)
                                          ]
                                        )}
                                      >
                                        {tStatus(getDisplayStatus(booking))}
                                      </span>
                                      <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                                        <User className="size-3 shrink-0" />
                                        <span className="truncate">
                                          {getClientName(booking.client_id)}
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                                </Link>
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
          </TabsContent>

          <TabsContent
            value="blackouts"
            className="flex flex-1 flex-col focus-visible:outline-none"
          >
            <div className="container mx-auto px-4 py-4 pb-6">
              <WorkerBlackoutManager />
            </div>
          </TabsContent>
        </Tabs>
      </AuthGuard>
    </SiteLayout>
  )
}
