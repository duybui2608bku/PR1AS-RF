"use client"

import * as React from "react"
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
  TrendingUp,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Table } from "@/components/ui/table"
import { useAdminBookingAnalytics } from "@/lib/hooks/use-bookings"
import { cn } from "@/lib/utils"
import type { Booking } from "@/types/booking"
import { BookingStatus } from "@/types/booking"

const RECENT_LIMIT = 12

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; className: string; barClassName: string }
> = {
  [BookingStatus.PENDING]: {
    label: "Chờ xác nhận",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    barClassName: "bg-amber-400",
  },
  [BookingStatus.CONFIRMED]: {
    label: "Đã xác nhận",
    className: "border-sky-200 bg-sky-50 text-sky-700",
    barClassName: "bg-sky-500",
  },
  [BookingStatus.IN_PROGRESS]: {
    label: "Đang thực hiện",
    className: "border-indigo-200 bg-indigo-50 text-indigo-700",
    barClassName: "bg-indigo-500",
  },
  [BookingStatus.COMPLETED]: {
    label: "Hoàn thành",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    barClassName: "bg-emerald-500",
  },
  [BookingStatus.CANCELLED]: {
    label: "Đã hủy",
    className: "border-zinc-200 bg-zinc-50 text-zinc-600",
    barClassName: "bg-zinc-400",
  },
  [BookingStatus.REJECTED]: {
    label: "Từ chối",
    className: "border-red-200 bg-red-50 text-red-700",
    barClassName: "bg-red-500",
  },
  [BookingStatus.DISPUTED]: {
    label: "Tranh chấp",
    className: "border-orange-200 bg-orange-50 text-orange-700",
    barClassName: "bg-orange-500",
  },
  [BookingStatus.EXPIRED]: {
    label: "Hết hạn",
    className: "border-slate-200 bg-slate-50 text-slate-600",
    barClassName: "bg-slate-400",
  },
}

function formatFilterDate(date?: Date) {
  if (!date) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseFilterDate(value?: string) {
  if (!value) return undefined
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

function formatDate(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

function formatChartLabel(value: string) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  })
}

function formatCurrency(amount?: number) {
  if (typeof amount !== "number") return "—"
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount)
}

function shortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id
}

function getUserLabel(user: Booking["client_id"]) {
  if (!user) return "—"
  if (typeof user === "string") return shortId(user)
  return user.full_name || user.email || shortId(user._id)
}

function getServiceLabel(service: Booking["service_id"]) {
  if (!service) return "—"
  if (typeof service === "string") return shortId(service)
  if (typeof service.name === "string") return service.name
  return (
    service.name?.vi ||
    service.name?.en ||
    service.code ||
    shortId(service._id)
  )
}

function getBookingPrice(booking: Booking) {
  const total = booking.pricing?.total_amount
  if (typeof total === "number") return formatCurrency(total)
  const quantity = booking.pricing?.quantity
  const unit = booking.pricing?.unit
  return quantity && unit ? `${quantity} ${unit.toLowerCase()}` : "—"
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const cfg = STATUS_CONFIG[status]

  return (
    <Badge variant="outline" className={cn("rounded-md", cfg.className)}>
      {cfg.label}
    </Badge>
  )
}

function StatCard({
  title,
  value,
  sub,
  icon,
  iconClassName,
}: {
  title: string
  value: React.ReactNode
  sub?: string
  icon: React.ReactNode
  iconClassName: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("rounded-lg p-1.5", iconClassName)}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  )
}

function BookingCreatedChart({
  data,
}: {
  data: { date: string; count: number }[]
}) {
  const display = data.slice(-31)
  const max = Math.max(...display.map((item) => item.count), 0)
  const chartWidth = 720
  const chartHeight = 220
  const padding = { top: 16, right: 12, bottom: 34, left: 38 }
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom
  const gap = 5
  const barWidth = Math.max(
    5,
    (innerWidth - gap * Math.max(display.length - 1, 0)) /
      Math.max(display.length, 1)
  )
  const axisY = padding.top + innerHeight
  const tickIndexes = [0, Math.floor(display.length / 2), display.length - 1]
    .filter((index) => display[index])
    .filter((index, position, indexes) => indexes.indexOf(index) === position)

  if (display.length === 0 || max <= 0) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
        Chưa có booking trong khoảng ngày đã chọn.
      </div>
    )
  }

  return (
    <div className="h-56 w-full">
      <svg
        role="img"
        aria-label="Biểu đồ booking được tạo theo ngày"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="h-full w-full overflow-visible"
        preserveAspectRatio="none"
      >
        {[0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = axisY - innerHeight * ratio
          return (
            <line
              key={ratio}
              x1={padding.left}
              x2={chartWidth - padding.right}
              y1={y}
              y2={y}
              className="stroke-border"
              strokeDasharray="4 6"
              strokeWidth="1"
            />
          )
        })}
        <line
          x1={padding.left}
          x2={chartWidth - padding.right}
          y1={axisY}
          y2={axisY}
          className="stroke-border"
          strokeWidth="1"
        />
        {display.map((item, index) => {
          const height =
            item.count > 0 ? Math.max((item.count / max) * innerHeight, 4) : 0
          const x = padding.left + index * (barWidth + gap)
          const y = axisY - height

          return (
            <g
              key={item.date}
              className="text-primary transition-colors hover:text-primary/75"
            >
              <title>{`${formatChartLabel(item.date)}: ${item.count} booking`}</title>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={height}
                rx="3"
                fill="currentColor"
              />
            </g>
          )
        })}
        {tickIndexes.map((index) => {
          const x = padding.left + index * (barWidth + gap) + barWidth / 2
          return (
            <text
              key={index}
              x={x}
              y={chartHeight - 10}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px]"
            >
              {formatChartLabel(display[index].date)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

function CompletionTrendChart({
  data,
}: {
  data: { date: string; completion_rate: number; completed: number; total: number }[]
}) {
  const display = data.slice(-31)
  const chartWidth = 720
  const chartHeight = 220
  const padding = { top: 16, right: 16, bottom: 34, left: 38 }
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom
  const pointGap = innerWidth / Math.max(display.length - 1, 1)
  const points = display.map((item, index) => {
    const x = padding.left + index * pointGap
    const y = padding.top + innerHeight - (item.completion_rate / 100) * innerHeight
    return { ...item, x, y }
  })
  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ")
  const tickIndexes = [0, Math.floor(display.length / 2), display.length - 1]
    .filter((index) => display[index])
    .filter((index, position, indexes) => indexes.indexOf(index) === position)

  if (display.length === 0 || display.every((item) => item.total === 0)) {
    return (
      <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
        Chưa có dữ liệu hoàn thành trong khoảng ngày đã chọn.
      </div>
    )
  }

  return (
    <div className="h-56 w-full">
      <svg
        role="img"
        aria-label="Biểu đồ tỉ lệ hoàn thành booking"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="h-full w-full overflow-visible"
        preserveAspectRatio="none"
      >
        {[0, 25, 50, 75, 100].map((value) => {
          const y = padding.top + innerHeight - (value / 100) * innerHeight
          return (
            <g key={value}>
              <line
                x1={padding.left}
                x2={chartWidth - padding.right}
                y1={y}
                y2={y}
                className="stroke-border"
                strokeDasharray={value === 0 ? undefined : "4 6"}
                strokeWidth="1"
              />
              <text
                x={8}
                y={y + 4}
                className="fill-muted-foreground text-[11px]"
              >
                {value}%
              </text>
            </g>
          )
        })}
        <path d={linePath} fill="none" className="stroke-emerald-500" strokeWidth="3" />
        {points.map((point) => (
          <g key={point.date} className="text-emerald-500">
            <title>
              {`${formatChartLabel(point.date)}: ${point.completion_rate}% (${point.completed}/${point.total})`}
            </title>
            <circle cx={point.x} cy={point.y} r="4" fill="currentColor" />
          </g>
        ))}
        {tickIndexes.map((index) => (
          <text
            key={index}
            x={points[index].x}
            y={chartHeight - 10}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px]"
          >
            {formatChartLabel(display[index].date)}
          </text>
        ))}
      </svg>
    </div>
  )
}

function StatusBreakdown({
  statuses,
}: {
  statuses: { status: BookingStatus; count: number; percentage: number }[]
}) {
  return (
    <div className="space-y-3">
      {statuses.map((item) => {
        const cfg = STATUS_CONFIG[item.status]
        return (
          <div key={item.status} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">{cfg.label}</span>
              <span className="font-medium tabular-nums">
                {item.count} · {item.percentage}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", cfg.barClassName)}
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CompletionGauge({ value }: { value: number }) {
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="flex items-center justify-center">
      <div className="relative size-36">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={radius}
            className="stroke-muted"
            strokeWidth="12"
            fill="none"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            className="stroke-emerald-500"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums">{value}%</span>
          <span className="text-xs text-muted-foreground">hoàn thành</span>
        </div>
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, rowIndex) => (
        <tr key={rowIndex} className="border-b">
          {Array.from({ length: 7 }).map((_, cellIndex) => (
            <td key={cellIndex} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export default function AdminBookingsPage() {
  const today = React.useMemo(() => new Date(), [])
  const initialStartDate = React.useMemo(() => {
    const date = new Date(today)
    date.setDate(date.getDate() - 29)
    return date
  }, [today])
  const [startDate, setStartDate] = React.useState(formatFilterDate(initialStartDate))
  const [endDate, setEndDate] = React.useState(formatFilterDate(today))

  const analyticsQuery = useAdminBookingAnalytics({
    start_date: startDate,
    end_date: endDate,
    recent_limit: RECENT_LIMIT,
  })

  const analytics = analyticsQuery.data
  const recentBookings = analytics?.recent_bookings ?? []
  const parsedStartDate = parseFilterDate(startDate)
  const parsedEndDate = parseFilterDate(endDate)

  const applyPreset = (days: number) => {
    const end = new Date()
    const start = new Date(end)
    start.setDate(start.getDate() - (days - 1))
    setStartDate(formatFilterDate(start))
    setEndDate(formatFilterDate(end))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="size-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">
              Booking analytics
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Theo dõi booking được tạo, trạng thái và tỉ lệ hoàn thành.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => analyticsQuery.refetch()}
          disabled={analyticsQuery.isFetching}
        >
          <RefreshCw
            className={cn("size-4", analyticsQuery.isFetching && "animate-spin")}
          />
          Làm mới
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Từ ngày</Label>
              <DatePicker
                value={parsedStartDate}
                onChange={(date) => setStartDate(formatFilterDate(date))}
                toDate={parsedEndDate}
                buttonClassName="h-9 w-44 data-[size=default]:h-9"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Đến ngày</Label>
              <DatePicker
                value={parsedEndDate}
                onChange={(date) => setEndDate(formatFilterDate(date))}
                fromDate={parsedStartDate}
                buttonClassName="h-9 w-44 data-[size=default]:h-9"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => applyPreset(7)}>
              7 ngày
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset(30)}>
              30 ngày
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset(90)}>
              90 ngày
            </Button>
          </div>
        </CardContent>
      </Card>

      {analyticsQuery.isError ? (
        <Card className="border-destructive/40">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
            <AlertCircle className="size-4" />
            Không tải được dữ liệu booking analytics.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng booking"
          value={
            analytics ? (
              analytics.total_bookings
            ) : (
              <Skeleton className="h-8 w-16" />
            )
          }
          sub="Theo ngày tạo booking"
          icon={<CalendarCheck className="size-4" />}
          iconClassName="bg-primary/10 text-primary"
        />
        <StatCard
          title="Hoàn thành"
          value={
            analytics ? (
              analytics.completed_bookings
            ) : (
              <Skeleton className="h-8 w-16" />
            )
          }
          sub={analytics ? `${analytics.completion_rate}% tổng booking` : undefined}
          icon={<CheckCircle2 className="size-4" />}
          iconClassName="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          title="Đang chờ"
          value={
            analytics ? (
              analytics.status_counts.find(
                (item) => item.status === BookingStatus.PENDING
              )?.count ?? 0
            ) : (
              <Skeleton className="h-8 w-16" />
            )
          }
          sub="Booking chưa được xác nhận"
          icon={<Clock className="size-4" />}
          iconClassName="bg-amber-100 text-amber-600"
        />
        <StatCard
          title="Hủy / tranh chấp"
          value={
            analytics ? (
              analytics.cancelled_bookings + analytics.disputed_bookings
            ) : (
              <Skeleton className="h-8 w-16" />
            )
          }
          sub={
            analytics
              ? `${analytics.cancellation_rate}% hủy · ${analytics.dispute_rate}% tranh chấp`
              : undefined
          }
          icon={<X className="size-4" />}
          iconClassName="bg-red-100 text-red-600"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Booking được tạo theo ngày
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsQuery.isLoading || !analytics ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <BookingCreatedChart data={analytics.created_by_date} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tỉ lệ hoàn thành
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analyticsQuery.isLoading || !analytics ? (
              <div className="flex justify-center">
                <Skeleton className="size-36 rounded-full" />
              </div>
            ) : (
              <>
                <CompletionGauge value={analytics.completion_rate} />
                <div className="grid grid-cols-2 gap-2 text-center text-sm">
                  <div className="rounded-lg border p-2">
                    <div className="font-semibold tabular-nums">
                      {analytics.completed_bookings}
                    </div>
                    <div className="text-xs text-muted-foreground">Hoàn thành</div>
                  </div>
                  <div className="rounded-lg border p-2">
                    <div className="font-semibold tabular-nums">
                      {Math.max(
                        analytics.total_bookings - analytics.completed_bookings,
                        0
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">Còn lại</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Xu hướng hoàn thành theo ngày
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsQuery.isLoading || !analytics ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <CompletionTrendChart data={analytics.completion_by_date} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Booking theo trạng thái
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsQuery.isLoading || !analytics ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <StatusBreakdown statuses={analytics.status_counts} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Booking mới nhất
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  Mã booking
                </th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  Client
                </th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  Worker
                </th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  Dịch vụ
                </th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  Lịch hẹn
                </th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-right font-medium whitespace-nowrap text-muted-foreground">
                  Giá
                </th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  Ngày tạo
                </th>
              </tr>
            </thead>
            <tbody>
              {analyticsQuery.isLoading ? (
                <TableSkeleton />
              ) : recentBookings.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-14 text-center text-muted-foreground"
                  >
                    Không có booking trong khoảng ngày đã chọn.
                  </td>
                </tr>
              ) : (
                recentBookings.map((booking) => (
                  <tr
                    key={booking._id}
                    className="border-b transition-colors last:border-b-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {shortId(booking.id ?? booking._id)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block max-w-40 truncate font-medium">
                        {getUserLabel(booking.client_id)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block max-w-40 truncate font-medium">
                        {getUserLabel(booking.worker_id)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block max-w-44 truncate">
                        {getServiceLabel(booking.service_id)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {booking.service_code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                      {formatDate(booking.schedule.start_time)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums">
                      {getBookingPrice(booking)}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                      {formatDate(booking.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
        {analyticsQuery.isFetching && !analyticsQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 border-t py-2 text-xs text-muted-foreground">
            <RefreshCw className="size-3.5 animate-spin" />
            Đang tải...
          </div>
        ) : null}
      </Card>
    </div>
  )
}
