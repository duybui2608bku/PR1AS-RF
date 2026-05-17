"use client"

import { useState, useCallback, type FormEvent } from "react"
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Loader2,
  Search,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table } from "@/components/ui/table"
import {
  useAdminTransactions,
  useAdminTransactionStats,
} from "@/lib/hooks/use-admin-transactions"
import type {
  AdminTransaction,
  AdminTransactionParams,
  AdminTransactionType,
} from "@/services/admin-wallet.service"
import type { WalletTransactionStatus } from "@/services/wallet.service"

const PAGE_SIZE = 15
const ALL_FILTER_VALUE = "all"

const STATUS_OPTIONS: {
  label: string
  value: WalletTransactionStatus | typeof ALL_FILTER_VALUE
}[] = [
  { label: "Tất cả trạng thái", value: ALL_FILTER_VALUE },
  { label: "Chờ xử lý", value: "pending" },
  { label: "Thành công", value: "success" },
  { label: "Thất bại", value: "failed" },
  { label: "Đã hủy", value: "cancelled" },
]

const TYPE_OPTIONS: {
  label: string
  value: AdminTransactionType | typeof ALL_FILTER_VALUE
}[] = [
  { label: "Tất cả loại", value: ALL_FILTER_VALUE },
  { label: "Nạp tiền", value: "deposit" },
  { label: "Rút tiền", value: "withdraw" },
  { label: "Thanh toán", value: "payment" },
  { label: "Hoàn tiền", value: "refund" },
  { label: "Chuyển khoản", value: "payout" },
]

const TYPE_LABELS: Record<AdminTransactionType, string> = {
  deposit: "Nạp tiền",
  withdraw: "Rút tiền",
  payment: "Thanh toán",
  refund: "Hoàn tiền",
  payout: "Chuyển khoản",
}

const STATUS_CONFIG: Record<
  WalletTransactionStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  pending: {
    label: "Chờ xử lý",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    icon: <Clock className="size-3" />,
  },
  success: {
    label: "Thành công",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    icon: <CheckCircle2 className="size-3" />,
  },
  failed: {
    label: "Thất bại",
    className: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    icon: <XCircle className="size-3" />,
  },
  cancelled: {
    label: "Đã hủy",
    className: "bg-muted text-muted-foreground",
    icon: <X className="size-3" />,
  },
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount)
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

function parseFilterDate(value?: string) {
  if (!value) return undefined
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

function formatFilterDate(date?: Date) {
  if (!date) return ""
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function shortId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id
}

function StatusBadge({ status }: { status: WalletTransactionStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

function TypeBadge({ type }: { type: AdminTransactionType }) {
  const isIn = type === "deposit" || type === "refund"
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium">
      {isIn ? (
        <ArrowDownCircle className="size-3.5 text-emerald-600" />
      ) : (
        <ArrowUpCircle className="size-3.5 text-blue-500" />
      )}
      {TYPE_LABELS[type]}
    </span>
  )
}

function BarChart({
  data,
}: {
  data: { date: string; amount: number; label: string }[]
}) {
  const display = data.slice(-30)
  const max = Math.max(...display.map((d) => d.amount), 0)
  const chartWidth = 640
  const chartHeight = 180
  const padding = { top: 12, right: 8, bottom: 30, left: 42 }
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom
  const barGap = 4
  const barWidth = Math.max(
    4,
    (innerWidth - barGap * Math.max(display.length - 1, 0)) /
      Math.max(display.length, 1)
  )
  const axisY = padding.top + innerHeight
  const tickIndexes = [0, Math.floor(display.length / 2), display.length - 1]
    .filter((index) => display[index])
    .filter((index, idx, arr) => arr.indexOf(index) === idx)

  if (display.length === 0 || max <= 0) {
    return (
      <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
        Chưa có giao dịch nạp tiền thành công trong 30 ngày gần nhất
      </div>
    )
  }

  return (
    <div className="h-44 w-full">
      <svg
        role="img"
        aria-label="Biểu đồ nạp tiền 30 ngày gần nhất"
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
            item.amount > 0 ? Math.max((item.amount / max) * innerHeight, 4) : 0
          const x = padding.left + index * (barWidth + barGap)
          const y = axisY - height
          return (
            <g
              key={item.date}
              className="text-emerald-500 transition-colors hover:text-emerald-400"
            >
              <title>{`${item.label}: ${formatCurrency(item.amount)}`}</title>
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
          const x = padding.left + index * (barWidth + barGap) + barWidth / 2
          return (
            <text
              key={index}
              x={x}
              y={chartHeight - 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px]"
            >
              {display[index].label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

function StatusBreakdown({
  successCount,
  pendingCount,
  failedCount,
  cancelledCount,
}: {
  successCount: number
  pendingCount: number
  failedCount: number
  cancelledCount: number
}) {
  const total = successCount + pendingCount + failedCount + cancelledCount

  const segments = [
    {
      label: "Thành công",
      count: successCount,
      barClass: "bg-emerald-500",
      dotClass: "bg-emerald-500",
    },
    {
      label: "Chờ xử lý",
      count: pendingCount,
      barClass: "bg-amber-400",
      dotClass: "bg-amber-400",
    },
    {
      label: "Thất bại",
      count: failedCount,
      barClass: "bg-red-500",
      dotClass: "bg-red-500",
    },
    {
      label: "Đã hủy",
      count: cancelledCount,
      barClass: "bg-muted-foreground/60",
      dotClass: "bg-muted-foreground/60",
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex h-4 overflow-hidden rounded-full bg-muted">
        {total > 0 ? (
          segments.map((seg) => (
            <div
              key={seg.label}
              className={`${seg.barClass} transition-all`}
              style={{ width: `${(seg.count / total) * 100}%` }}
            />
          ))
        ) : (
          <div className="w-full bg-muted" />
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-sm">
            <div className={`size-2.5 shrink-0 rounded-sm ${seg.dotClass}`} />
            <span className="text-muted-foreground">{seg.label}</span>
            <span className="ml-auto font-semibold tabular-nums">
              {seg.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  sub,
  icon,
  iconClass,
}: {
  title: string
  value: React.ReactNode
  sub?: string
  icon: React.ReactNode
  iconClass?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={`rounded-lg p-1.5 ${iconClass ?? "bg-primary/10 text-primary"}`}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {sub ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function TransactionDetailModal({
  tx,
  onClose,
}: {
  tx: AdminTransaction
  onClose: () => void
}) {
  const rows: [string, React.ReactNode][] = [
    ["ID giao dịch", tx.id],
    ["User ID", tx.user_id],
    ["Email người dùng", tx.user?.email ?? "—"],
    ["Họ tên", tx.user?.full_name ?? "—"],
    ["Loại giao dịch", TYPE_LABELS[tx.type]],
    ["Số tiền", formatCurrency(tx.amount)],
    ["Trạng thái", <StatusBadge key="s" status={tx.status} />],
    ["Cổng thanh toán", tx.gateway ?? "—"],
    ["Mã GD cổng", tx.gateway_transaction_id ?? "—"],
    ["Mã thanh toán", tx.payment_code ?? "—"],
    ["Nội dung CK", tx.payment_content ?? "—"],
    ["SePay TxID", tx.sepay_transaction_id ?? "—"],
    ["SePay RefCode", tx.sepay_reference_code ?? "—"],
    ["Mô tả", tx.description ?? "—"],
    ["Tiền tệ", tx.currency],
    ["Ngày tạo", formatDate(tx.created_at)],
    ["Cập nhật", formatDate(tx.updated_at)],
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4 dark:bg-background/70">
      <div className="w-full max-w-lg rounded-xl border bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold">Chi tiết giao dịch</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">
          <dl className="divide-y text-sm">
            {rows.map(([label, val]) => (
              <div key={label} className="flex gap-4 py-2.5">
                <dt className="w-40 shrink-0 text-muted-foreground">{label}</dt>
                <dd className="font-medium break-all">{val}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b">
          {Array.from({ length: 8 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export default function AdminTransactionsPage() {
  const [filters, setFilters] = useState<AdminTransactionParams>({
    page: 1,
    limit: PAGE_SIZE,
    search: "",
    status: "",
    type: "",
    startDate: "",
    endDate: "",
  })
  const [searchInput, setSearchInput] = useState("")
  const [detailTx, setDetailTx] = useState<AdminTransaction | null>(null)

  const txQuery = useAdminTransactions(filters)
  const statsQuery = useAdminTransactionStats()

  const transactions = txQuery.data?.data ?? []
  const total = txQuery.data?.pagination?.total ?? 0
  const totalPages = txQuery.data?.pagination?.totalPages ?? 1
  const currentPage = filters.page ?? 1
  const startDate = parseFilterDate(filters.startDate)
  const endDate = parseFilterDate(filters.endDate)

  const stats = statsQuery.data
  const dailyData =
    stats?.dailyData?.map((d) => ({
      date: d.date,
      amount: d.amount,
      label: new Date(d.date).toLocaleDateString("vi-VN", {
        month: "numeric",
        day: "numeric",
      }),
    })) ?? []

  const hasFilters = Boolean(
    filters.search ||
    filters.status ||
    filters.type ||
    filters.startDate ||
    filters.endDate
  )

  const applySearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      setFilters((prev) => ({ ...prev, page: 1, search: searchInput.trim() }))
    },
    [searchInput]
  )

  const clearSearch = () => {
    setSearchInput("")
    setFilters((prev) => ({ ...prev, page: 1, search: "" }))
  }

  const handleFilterChange = (
    key: keyof AdminTransactionParams,
    value: string
  ) => {
    setFilters((prev) => ({ ...prev, page: 1, [key]: value }))
  }

  const handleDateFilterChange = (
    key: "startDate" | "endDate",
    value?: Date
  ) => {
    handleFilterChange(key, formatFilterDate(value))
  }

  const clearFilters = () => {
    setSearchInput("")
    setFilters({
      page: 1,
      limit: PAGE_SIZE,
      search: "",
      status: "",
      type: "",
      startDate: "",
      endDate: "",
    })
  }

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Quản lý giao dịch
          </h1>
          <p className="text-sm text-muted-foreground">
            Tổng cộng{" "}
            <span className="font-medium text-foreground">{total}</span> giao
            dịch
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng nạp tiền (thành công)"
          value={
            stats ? (
              formatCurrency(stats.successAmount)
            ) : (
              <Skeleton className="h-8 w-32" />
            )
          }
          sub={stats ? `${stats.successCount} giao dịch` : undefined}
          icon={<TrendingUp className="size-4" />}
          iconClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
        />
        <StatCard
          title="Tổng giao dịch"
          value={stats ? stats.totalCount : <Skeleton className="h-8 w-16" />}
          icon={<CreditCard className="size-4" />}
          iconClass="bg-primary/10 text-primary"
        />
        <StatCard
          title="Đang chờ xử lý"
          value={stats ? stats.pendingCount : <Skeleton className="h-8 w-16" />}
          icon={<Clock className="size-4" />}
          iconClass="bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300"
        />
        <StatCard
          title="Thất bại / Đã hủy"
          value={
            stats ? (
              stats.failedCount + stats.cancelledCount
            ) : (
              <Skeleton className="h-8 w-16" />
            )
          }
          icon={<AlertCircle className="size-4" />}
          iconClass="bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300"
        />
      </div>

      {/* Charts */}
      {statsQuery.isError ? null : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Biểu đồ nạp tiền (30 ngày gần nhất)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsQuery.isLoading ? (
                <Skeleton className="h-44 w-full" />
              ) : dailyData.length > 0 ? (
                <BarChart data={dailyData} />
              ) : (
                <div className="flex h-36 items-center justify-center text-sm text-muted-foreground">
                  Chưa có dữ liệu biểu đồ
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Phân bổ trạng thái
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsQuery.isLoading || !stats ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full rounded-full" />
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              ) : (
                <StatusBreakdown
                  successCount={stats.successCount}
                  pendingCount={stats.pendingCount}
                  failedCount={stats.failedCount}
                  cancelledCount={stats.cancelledCount}
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Bộ lọc
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            onSubmit={applySearch}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pr-8 pl-9"
                placeholder="Tìm theo email, mã giao dịch, mã thanh toán..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
            <Button type="submit" size="sm" className="w-full sm:w-auto">
              Tìm kiếm
            </Button>
          </form>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="flex w-full flex-col gap-1 sm:w-auto">
              <Label className="text-xs text-muted-foreground">
                Trạng thái
              </Label>
              <Select
                value={filters.status || ALL_FILTER_VALUE}
                onValueChange={(value) =>
                  handleFilterChange(
                    "status",
                    value === ALL_FILTER_VALUE ? "" : value
                  )
                }
              >
                <SelectTrigger className="h-9 w-full data-[size=default]:h-9 sm:min-w-40">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex w-full flex-col gap-1 sm:w-auto">
              <Label className="text-xs text-muted-foreground">
                Loại giao dịch
              </Label>
              <Select
                value={filters.type || ALL_FILTER_VALUE}
                onValueChange={(value) =>
                  handleFilterChange(
                    "type",
                    value === ALL_FILTER_VALUE ? "" : value
                  )
                }
              >
                <SelectTrigger className="h-9 w-full data-[size=default]:h-9 sm:min-w-40">
                  <SelectValue placeholder="Chọn loại" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex w-full flex-col gap-1 sm:w-auto">
              <Label className="text-xs text-muted-foreground">Từ ngày</Label>
              <DatePicker
                value={startDate}
                onChange={(date) => handleDateFilterChange("startDate", date)}
                toDate={endDate}
                buttonClassName="h-9 w-full sm:w-44 data-[size=default]:h-9"
              />
            </div>

            <div className="flex w-full flex-col gap-1 sm:w-auto">
              <Label className="text-xs text-muted-foreground">Đến ngày</Label>
              <DatePicker
                value={endDate}
                onChange={(date) => handleDateFilterChange("endDate", date)}
                fromDate={startDate}
                buttonClassName="h-9 w-full sm:w-44 data-[size=default]:h-9"
              />
            </div>

            {hasFilters ? (
              <div className="flex w-full items-end sm:w-auto">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 size-4" />
                  Xóa bộ lọc
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  Mã GD
                </th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  Người dùng
                </th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  Loại
                </th>
                <th className="px-4 py-3 text-right font-medium whitespace-nowrap text-muted-foreground">
                  Số tiền
                </th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  Cổng TT
                </th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  Mã GD cổng
                </th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  Ngày tạo
                </th>
                <th className="px-4 py-3 text-right font-medium whitespace-nowrap text-muted-foreground">
                  Chi tiết
                </th>
              </tr>
            </thead>
            <tbody>
              {txQuery.isLoading ? (
                <TableSkeleton />
              ) : transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-16 text-center text-muted-foreground"
                  >
                    Không tìm thấy giao dịch nào.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="border-b transition-colors last:border-b-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {shortId(tx.id)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="max-w-[160px] truncate font-medium">
                          {tx.user?.full_name ?? "—"}
                        </span>
                        <span className="max-w-[160px] truncate text-xs text-muted-foreground">
                          {tx.user?.email ?? tx.user_id}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={tx.type} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {tx.gateway ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {tx.gateway_transaction_id
                        ? shortId(tx.gateway_transaction_id)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                      {formatDate(tx.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailTx(tx)}
                      >
                        Xem
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>

        {totalPages > 1 ? (
          <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Trang {currentPage} / {totalPages} — {total} kết quả
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || txQuery.isFetching}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <ChevronLeft className="size-4" />
              </Button>

              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const startPage = Math.max(
                  1,
                  Math.min(currentPage - 2, totalPages - 4)
                )
                const page = startPage + i
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    className="w-9"
                    onClick={() => handlePageChange(page)}
                    disabled={txQuery.isFetching}
                  >
                    {page}
                  </Button>
                )
              })}

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || txQuery.isFetching}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}

        {txQuery.isFetching && !txQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 border-t py-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Đang tải...
          </div>
        ) : null}
      </Card>

      {detailTx ? (
        <TransactionDetailModal
          tx={detailTx}
          onClose={() => setDetailTx(null)}
        />
      ) : null}
    </div>
  )
}
