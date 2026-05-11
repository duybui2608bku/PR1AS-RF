"use client"

import * as React from "react"
import Link from "next/link"
import {
  CalendarCheck,
  CreditCard,
  MessageSquare,
  PackageCheck,
  RefreshCw,
  UserPlus,
  Users,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useAdminTransactionStats } from "@/lib/hooks/use-admin-transactions"
import { useDashboardAnalytics } from "@/lib/hooks/use-dashboard-analytics"
import { cn } from "@/lib/utils"
import type {
  DashboardDailyCount,
  DashboardPackageRegistrationByDate,
  DashboardPackageRegistrationByPlan,
} from "@/services/dashboard.service"
import type { PricingPlanCode } from "@/services/pricing.service"

const PLAN_LABELS: Record<PricingPlanCode, string> = {
  standard: "Standard",
  gold: "Gold",
  diamond: "Diamond",
}

const PLAN_COLORS: Record<PricingPlanCode, string> = {
  standard: "bg-sky-500",
  gold: "bg-amber-400",
  diamond: "bg-emerald-500",
}

const PLAN_SVG_COLORS: Record<PricingPlanCode, string> = {
  standard: "#0ea5e9",
  gold: "#f59e0b",
  diamond: "#10b981",
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount)
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

function formatChartLabel(value: string) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  })
}

function MetricCard({
  title,
  value,
  sub,
  icon,
  iconClassName,
  href,
}: {
  title: string
  value: React.ReactNode
  sub?: string
  icon: React.ReactNode
  iconClassName: string
  href?: string
}) {
  const content = (
    <Card
      className={cn(href && "cursor-pointer transition-shadow hover:shadow-md")}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("rounded-lg p-1.5", iconClassName)}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {sub ? <CardDescription className="mt-1">{sub}</CardDescription> : null}
      </CardContent>
    </Card>
  )

  return href ? <Link href={href}>{content}</Link> : content
}

function BarChart({
  data,
  emptyText,
}: {
  data: DashboardDailyCount[]
  emptyText: string
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
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    )
  }

  return (
    <div className="h-56 w-full">
      <svg
        role="img"
        aria-label="Biểu đồ user đăng ký mới"
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
              <title>{`${formatChartLabel(item.date)}: ${item.count} user`}</title>
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

function PackageStackedChart({
  data,
}: {
  data: DashboardPackageRegistrationByDate[]
}) {
  const display = data.slice(-31)
  const max = Math.max(...display.map((item) => item.total), 0)
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
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Chưa có lượt đăng ký gói trong khoảng ngày đã chọn.
      </div>
    )
  }

  return (
    <div className="h-56 w-full">
      <svg
        role="img"
        aria-label="Biểu đồ các gói được đăng ký"
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
          const x = padding.left + index * (barWidth + gap)
          let y = axisY
          const segments: Array<{ plan: PricingPlanCode; count: number }> = [
            { plan: "standard", count: item.standard },
            { plan: "gold", count: item.gold },
            { plan: "diamond", count: item.diamond },
          ]

          return (
            <g key={item.date}>
              <title>
                {`${formatChartLabel(item.date)}: Standard ${item.standard}, Gold ${item.gold}, Diamond ${item.diamond}`}
              </title>
              {segments.map((segment) => {
                if (segment.count <= 0) return null
                const height = Math.max((segment.count / max) * innerHeight, 3)
                y -= height
                return (
                  <rect
                    key={segment.plan}
                    x={x}
                    y={y}
                    width={barWidth}
                    height={height}
                    rx="2"
                    fill={PLAN_SVG_COLORS[segment.plan]}
                  />
                )
              })}
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

function PackageBreakdown({
  data,
}: {
  data: DashboardPackageRegistrationByPlan[]
}) {
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.plan_code} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className={cn(
                  "size-2.5 rounded-sm",
                  PLAN_COLORS[item.plan_code]
                )}
              />
              {PLAN_LABELS[item.plan_code]}
            </span>
            <span className="font-medium tabular-nums">
              {item.count} · {item.percentage}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", PLAN_COLORS[item.plan_code])}
              style={{ width: `${item.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const today = React.useMemo(() => new Date(), [])
  const initialStartDate = React.useMemo(() => {
    const date = new Date(today)
    date.setDate(date.getDate() - 29)
    return date
  }, [today])
  const [startDate, setStartDate] = React.useState(
    formatFilterDate(initialStartDate)
  )
  const [endDate, setEndDate] = React.useState(formatFilterDate(today))

  const dashboardQuery = useDashboardAnalytics({
    start_date: startDate,
    end_date: endDate,
  })
  const statsQuery = useAdminTransactionStats()

  const analytics = dashboardQuery.data
  const parsedStartDate = parseFilterDate(startDate)
  const parsedEndDate = parseFilterDate(endDate)
  const totalTxAmount = statsQuery.data?.successAmount
  const pendingCount = statsQuery.data?.pendingCount ?? "—"

  const applyPreset = (days: number) => {
    const end = new Date()
    const start = new Date(end)
    start.setDate(start.getDate() - (days - 1))
    setStartDate(formatFilterDate(start))
    setEndDate(formatFilterDate(end))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tổng quan</h1>
          <p className="hidden text-sm text-muted-foreground sm:block">
            Theo dõi user đăng ký mới và lượt đăng ký gói theo thời gian.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => dashboardQuery.refetch()}
          disabled={dashboardQuery.isFetching}
        >
          <RefreshCw
            className={cn(
              "size-4",
              dashboardQuery.isFetching && "animate-spin"
            )}
          />
          Làm mới
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="flex w-full flex-col gap-1 sm:w-auto">
              <Label className="text-xs text-muted-foreground">Từ ngày</Label>
              <DatePicker
                value={parsedStartDate}
                onChange={(date) => setStartDate(formatFilterDate(date))}
                toDate={parsedEndDate}
                buttonClassName="h-9 w-full sm:w-44 data-[size=default]:h-9"
              />
            </div>
            <div className="flex w-full flex-col gap-1 sm:w-auto">
              <Label className="text-xs text-muted-foreground">Đến ngày</Label>
              <DatePicker
                value={parsedEndDate}
                onChange={(date) => setEndDate(formatFilterDate(date))}
                fromDate={parsedStartDate}
                buttonClassName="h-9 w-full sm:w-44 data-[size=default]:h-9"
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          href="/dashboard/users"
          title="Tổng người dùng"
          value={
            analytics ? (
              analytics.total_users
            ) : (
              <Skeleton className="h-8 w-16" />
            )
          }
          sub={
            analytics
              ? `${analytics.new_users} user mới trong khoảng ngày`
              : undefined
          }
          icon={<Users className="size-4" />}
          iconClassName="bg-primary/10 text-primary"
        />
        <MetricCard
          title="User đăng ký mới"
          value={
            analytics ? analytics.new_users : <Skeleton className="h-8 w-16" />
          }
          sub="Theo ngày tạo tài khoản"
          icon={<UserPlus className="size-4" />}
          iconClassName="bg-sky-100 text-sky-600"
        />
        <MetricCard
          title="Lượt đăng ký gói"
          value={
            analytics ? (
              analytics.package_registrations_total
            ) : (
              <Skeleton className="h-8 w-16" />
            )
          }
          sub="Standard từ user mới, Gold/Diamond từ upgrade"
          icon={<PackageCheck className="size-4" />}
          iconClassName="bg-emerald-100 text-emerald-600"
        />
        <MetricCard
          href="/dashboard/transactions"
          title="Tổng nạp tiền"
          value={
            totalTxAmount !== undefined ? (
              formatCurrency(totalTxAmount)
            ) : (
              <Skeleton className="h-8 w-28" />
            )
          }
          sub={`${pendingCount} giao dịch đang chờ xử lý`}
          icon={<CreditCard className="size-4" />}
          iconClassName="bg-amber-100 text-amber-600"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              User đăng ký mới theo ngày
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardQuery.isLoading || !analytics ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <BarChart
                data={analytics.user_registrations_by_date}
                emptyText="Chưa có user đăng ký mới trong khoảng ngày đã chọn."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Các gói được đăng ký theo ngày
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardQuery.isLoading || !analytics ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <PackageStackedChart
                data={analytics.package_registrations_by_date}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Điều hướng nhanh
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              href="/dashboard/bookings"
              title="Bookings"
              value="Xem"
              sub="Thống kê booking và tỉ lệ hoàn thành"
              icon={<CalendarCheck className="size-4" />}
              iconClassName="bg-indigo-100 text-indigo-600"
            />
            <MetricCard
              href="/dashboard/disputes"
              title="Chat tranh chấp"
              value="Xem"
              sub="Các cuộc hội thoại tranh chấp"
              icon={<MessageSquare className="size-4" />}
              iconClassName="bg-orange-100 text-orange-600"
            />
            <MetricCard
              href="/dashboard/transactions"
              title="Giao dịch"
              value="Xem"
              sub="Nạp tiền và trạng thái"
              icon={<CreditCard className="size-4" />}
              iconClassName="bg-amber-100 text-amber-600"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tỉ lệ gói được đăng ký
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardQuery.isLoading || !analytics ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <PackageBreakdown
                data={analytics.package_registrations_by_plan}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
