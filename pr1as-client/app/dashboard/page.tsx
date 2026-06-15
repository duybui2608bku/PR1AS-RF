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
  ArrowRight,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useAdminTransactionStats } from "@/lib/hooks/use-admin-transactions"
import { useDashboardAnalytics } from "@/lib/hooks/use-dashboard-analytics"
import { useCurrency } from "@/lib/hooks/use-currency"
import { useAuthStore } from "@/lib/store/auth-store"
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

const PLAN_GRADIENTS: Record<PricingPlanCode, string> = {
  standard: "from-sky-400 to-sky-600",
  gold: "from-amber-300 to-amber-500",
  diamond: "from-emerald-400 to-emerald-600",
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
      className={cn(
        "relative overflow-hidden border border-border/70 bg-background/50 backdrop-blur-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20",
        href && "cursor-pointer"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2.5">
        <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase select-none">
          {title}
        </CardTitle>
        <div className={cn("flex size-9 items-center justify-center rounded-xl shadow-3xs transition-transform duration-300", iconClassName)}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-extrabold tracking-tight tabular-nums text-foreground/90">{value}</div>
        {sub ? (
          <CardDescription className="mt-1.5 text-xs text-muted-foreground/80 flex items-center gap-1 select-none">
            {sub}
          </CardDescription>
        ) : null}
      </CardContent>
    </Card>
  )

  return href ? <Link href={href}>{content}</Link> : content
}

function QuickActionCard({
  title,
  description,
  href,
  icon,
  iconClassName,
}: {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  iconClassName: string
}) {
  return (
    <Link href={href} className="group block">
      <div className="relative flex flex-col justify-between h-full rounded-xl border border-border/60 bg-background/30 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/25 hover:bg-background/80">
        <div className="flex items-start justify-between gap-4">
          <div className={cn("flex size-9 items-center justify-center rounded-lg shadow-3xs transition-transform group-hover:scale-105", iconClassName)}>
            {icon}
          </div>
          <div className="rounded-full bg-muted p-1 text-muted-foreground transition-all duration-300 group-hover:bg-primary/10 group-hover:text-primary">
            <ArrowRight className="size-3.5 translate-x-0 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-foreground/90 group-hover:text-primary transition-colors">{title}</h4>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{description}</p>
        </div>
      </div>
    </Link>
  )
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
  const padding = { top: 16, right: 12, bottom: 34, left: 48 }
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

  const yTicks = React.useMemo(() => {
    if (max <= 0) return []
    return [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const val = Math.round(max * ratio)
      const y = axisY - innerHeight * ratio
      return { val, y }
    })
  }, [max, innerHeight, axisY])

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
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {yTicks.map(({ val, y }, idx) => (
          <g key={idx} className="opacity-70">
            {val > 0 && (
              <line
                x1={padding.left}
                x2={chartWidth - padding.right}
                y1={y}
                y2={y}
                className="stroke-border"
                strokeDasharray="4 6"
                strokeWidth="1"
              />
            )}
            <text
              x={padding.left - 10}
              y={y + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[10px] tabular-nums font-semibold"
            >
              {val}
            </text>
          </g>
        ))}

        <line
          x1={padding.left}
          x2={chartWidth - padding.right}
          y1={axisY}
          y2={axisY}
          className="stroke-border"
          strokeWidth="1.5"
        />

        {display.map((item, index) => {
          const height =
            item.count > 0 ? Math.max((item.count / max) * innerHeight, 4) : 0
          const x = padding.left + index * (barWidth + gap)
          const y = axisY - height

          return (
            <g
              key={item.date}
              className="text-primary"
            >
              <title>{`${formatChartLabel(item.date)}: ${item.count} user`}</title>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={height}
                rx="2"
                fill="url(#barGrad)"
                className="hover:opacity-80 transition-all duration-200 cursor-pointer"
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
              y={chartHeight - 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px] font-semibold"
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
  const padding = { top: 16, right: 12, bottom: 34, left: 48 }
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

  const yTicks = React.useMemo(() => {
    if (max <= 0) return []
    return [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
      const val = Math.round(max * ratio)
      const y = axisY - innerHeight * ratio
      return { val, y }
    })
  }, [max, innerHeight, axisY])

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
        <defs>
          <linearGradient id="gradStandard" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="gradGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="gradDiamond" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {yTicks.map(({ val, y }, idx) => (
          <g key={idx} className="opacity-70">
            {val > 0 && (
              <line
                x1={padding.left}
                x2={chartWidth - padding.right}
                y1={y}
                y2={y}
                className="stroke-border"
                strokeDasharray="4 6"
                strokeWidth="1"
              />
            )}
            <text
              x={padding.left - 10}
              y={y + 4}
              textAnchor="end"
              className="fill-muted-foreground text-[10px] tabular-nums font-semibold"
            >
              {val}
            </text>
          </g>
        ))}

        <line
          x1={padding.left}
          x2={chartWidth - padding.right}
          y1={axisY}
          y2={axisY}
          className="stroke-border"
          strokeWidth="1.5"
        />

        {display.map((item, index) => {
          const x = padding.left + index * (barWidth + gap)
          let y = axisY
          const segments: Array<{ plan: PricingPlanCode; count: number; grad: string }> = [
            { plan: "standard", count: item.standard, grad: "url(#gradStandard)" },
            { plan: "gold", count: item.gold, grad: "url(#gradGold)" },
            { plan: "diamond", count: item.diamond, grad: "url(#gradDiamond)" },
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
                    rx="1.5"
                    fill={segment.grad}
                    className="hover:opacity-80 transition-all duration-200 cursor-pointer"
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
              y={chartHeight - 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px] font-semibold"
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
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.plan_code} className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground font-medium text-xs">
              <span
                className={cn(
                  "size-2.5 rounded-xs",
                  PLAN_COLORS[item.plan_code]
                )}
              />
              {PLAN_LABELS[item.plan_code]}
            </span>
            <span className="font-semibold text-foreground/90 text-xs tabular-nums">
              {item.count} · {item.percentage}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted shadow-inner">
            <div
              className={cn("h-full rounded-full bg-gradient-to-r", PLAN_GRADIENTS[item.plan_code])}
              style={{ width: `${item.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { format: formatCurrency } = useCurrency()
  const user = useAuthStore((state) => state.user)

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours()
    const displayName = user?.full_name || user?.name || "Admin"
    if (hour < 12) return `Chào buổi sáng, ${displayName}`
    if (hour < 18) return `Chào buổi chiều, ${displayName}`
    return `Chào buổi tối, ${displayName}`
  }, [user])

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
  const [activePreset, setActivePreset] = React.useState<number | null>(30)

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
    setActivePreset(days)
  }

  const handleDateChange = (range: any) => {
    setStartDate(formatFilterDate(range?.from))
    setEndDate(formatFilterDate(range?.to ?? range?.from))
    setActivePreset(null)
  }

  return (
    <div className="space-y-6">
      {/* Header and Welcome */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground/90">{greeting} 👋</h1>
          <p className="hidden text-sm text-muted-foreground sm:block mt-1">
            Theo dõi hoạt động hệ thống, người dùng đăng ký mới và doanh thu.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9 shadow-2xs font-medium hover:bg-muted"
          onClick={() => dashboardQuery.refetch()}
          disabled={dashboardQuery.isFetching}
          aria-label="Làm mới dữ liệu"
          title="Làm mới dữ liệu"
        >
          <RefreshCw
            className={cn(
              "size-4",
              dashboardQuery.isFetching && "animate-spin"
            )}
          />
        </Button>
      </div>

      {/* Date Filter Panel */}
      <Card className="border-border/70 shadow-3xs bg-background/50 backdrop-blur-xs">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-muted-foreground/80 select-none">
              Khoảng ngày phân tích
            </Label>
            <DateRangePicker
              value={{ from: parsedStartDate, to: parsedEndDate }}
              onChange={handleDateChange}
              buttonClassName="h-9 w-full sm:w-72 data-[size=default]:h-9 shadow-3xs"
            />
          </div>
          <div className="flex items-center self-end sm:self-center bg-muted/65 p-1 rounded-lg border border-border/40 w-full sm:w-auto justify-around sm:justify-start">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-3 text-xs rounded-md transition-all",
                activePreset === 7 && "bg-background shadow-3xs font-semibold text-foreground"
              )}
              onClick={() => applyPreset(7)}
            >
              7 ngày
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-3 text-xs rounded-md transition-all",
                activePreset === 30 && "bg-background shadow-3xs font-semibold text-foreground"
              )}
              onClick={() => applyPreset(30)}
            >
              30 ngày
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-3 text-xs rounded-md transition-all",
                activePreset === 90 && "bg-background shadow-3xs font-semibold text-foreground"
              )}
              onClick={() => applyPreset(90)}
            >
              90 ngày
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
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
              ? `+${analytics.new_users} user mới gần đây`
              : undefined
          }
          icon={<Users className="size-4" />}
          iconClassName="bg-primary/10 text-primary border border-primary/20"
        />
        <MetricCard
          title="User đăng ký mới"
          value={
            analytics ? analytics.new_users : <Skeleton className="h-8 w-16" />
          }
          sub="Trong khoảng ngày đã chọn"
          icon={<UserPlus className="size-4" />}
          iconClassName="bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400 border border-sky-500/20"
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
          sub="Standard, Gold & Diamond"
          icon={<PackageCheck className="size-4" />}
          iconClassName="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-500/20"
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
          sub={`${pendingCount} giao dịch đang chờ`}
          icon={<CreditCard className="size-4" />}
          iconClassName="bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-500/20"
        />
      </div>

      {/* Main Charts Block */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/70 shadow-3xs bg-background/50 backdrop-blur-xs">
          <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-foreground/90">
                User đăng ký mới theo ngày
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Biểu đồ tần suất tài khoản mới
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
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

        <Card className="border-border/70 shadow-3xs bg-background/50 backdrop-blur-xs">
          <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-foreground/90">
                Các gói được đăng ký theo ngày
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Phân bố nâng cấp gói dịch vụ
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold">
              <span className="flex items-center gap-1 text-sky-500">
                <span className="size-2 rounded-full bg-sky-500" /> Standard
              </span>
              <span className="flex items-center gap-1 text-amber-500">
                <span className="size-2 rounded-full bg-amber-500" /> Gold
              </span>
              <span className="flex items-center gap-1 text-emerald-500">
                <span className="size-2 rounded-full bg-emerald-500" /> Diamond
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
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

      {/* Navigation and Breakdown */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="border-border/70 shadow-3xs bg-background/50 backdrop-blur-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-bold text-foreground/90">
              Điều hướng quản trị nhanh
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Truy cập nhanh vào các tính năng trọng tâm
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
            <QuickActionCard
              href="/dashboard/bookings"
              title="Quản lý Bookings"
              description="Thống kê trạng thái lịch hẹn và tỷ lệ hoàn thành công việc."
              icon={<CalendarCheck className="size-4 text-indigo-600 dark:text-indigo-400" />}
              iconClassName="bg-indigo-500/10 border border-indigo-500/20"
            />
            <QuickActionCard
              href="/dashboard/disputes"
              title="Giải quyết Tranh chấp"
              description="Xem và quản trị các phòng chat hòa giải, giải quyết tranh chấp."
              icon={<MessageSquare className="size-4 text-orange-600 dark:text-orange-400" />}
              iconClassName="bg-orange-500/10 border border-orange-500/20"
            />
            <QuickActionCard
              href="/dashboard/transactions"
              title="Lịch sử Giao dịch"
              description="Theo dõi nạp tiền, rút tiền, doanh thu và kiểm tra giao dịch chờ duyệt."
              icon={<CreditCard className="size-4 text-amber-600 dark:text-amber-400" />}
              iconClassName="bg-amber-500/10 border border-amber-500/20"
            />
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-3xs bg-background/50 backdrop-blur-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-bold text-foreground/90">
              Tỉ lệ gói được đăng ký
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Phần trăm cơ cấu doanh thu theo gói
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {dashboardQuery.isLoading || !analytics ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-2 w-full" />
                  </div>
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

