"use client"

import { useState, useCallback, type FormEvent } from "react"
import Image from "next/image"
import {
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table } from "@/components/ui/table"
import { useGetUsers, useUpdateUserStatus } from "@/lib/hooks/use-users"
import type {
  GetUsersParams,
  UserListItem,
  UserRole,
  UserStatus,
} from "@/services/user.service"
import { getErrorMessage } from "@/lib/utils/error-handler"

const PAGE_SIZE = 10
const ALL_FILTER_VALUE = "all"

const ROLE_OPTIONS: {
  label: string
  value: UserRole | typeof ALL_FILTER_VALUE
}[] = [
  { label: "Tất cả vai trò", value: ALL_FILTER_VALUE },
  { label: "Client", value: "client" },
  { label: "Worker", value: "worker" },
  { label: "Admin", value: "admin" },
]

const STATUS_OPTIONS: {
  label: string
  value: UserStatus | typeof ALL_FILTER_VALUE
}[] = [
  { label: "Tất cả trạng thái", value: ALL_FILTER_VALUE },
  { label: "Hoạt động", value: "active" },
  { label: "Đã khóa", value: "banned" },
]

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

function StatusBadge({ status }: { status?: string }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        <ShieldCheck className="size-3" />
        Hoạt động
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
      <ShieldAlert className="size-3" />
      Đã khóa
    </span>
  )
}

function PlanBadge({ code }: { code?: string }) {
  const label = code ?? "standard"
  const lower = label.toLowerCase()
  const color =
    lower === "gold"
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300"
      : lower === "diamond"
        ? "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
        : "bg-muted text-muted-foreground"
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase ${color}`}
    >
      {label}
    </span>
  )
}

function UserAvatar({ user }: { user: UserListItem }) {
  if (user.avatar) {
    return (
      <Image
        src={user.avatar}
        alt={user.full_name ?? user.email}
        width={36}
        height={36}
        className="size-9 rounded-full object-cover"
      />
    )
  }
  return (
    <div className="flex size-9 items-center justify-center rounded-full bg-muted">
      <User className="size-4 text-muted-foreground" />
    </div>
  )
}

function ConfirmDialog({
  user,
  nextStatus,
  onConfirm,
  onCancel,
  isPending,
}: {
  user: UserListItem
  nextStatus: UserStatus
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  const isBanning = nextStatus === "banned"
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 dark:bg-background/70">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-xl">
        <h2 className="mb-2 text-base font-semibold">
          {isBanning ? "Xác nhận khóa tài khoản" : "Xác nhận mở khóa tài khoản"}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {isBanning
            ? `Khóa tài khoản của "${user.full_name ?? user.email}"? Người dùng sẽ không thể đăng nhập.`
            : `Mở khóa tài khoản của "${user.full_name ?? user.email}"? Người dùng sẽ có thể đăng nhập lại.`}
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
          >
            Hủy
          </Button>
          <Button
            size="sm"
            variant={isBanning ? "outline" : "default"}
            className={
              isBanning
                ? "border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40 dark:hover:text-red-200"
                : ""
            }
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isBanning ? "Khóa" : "Mở khóa"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function UserTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b">
          {Array.from({ length: 9 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export default function AdminUsersPage() {
  const [filters, setFilters] = useState<GetUsersParams>({
    page: 1,
    limit: PAGE_SIZE,
    search: "",
    role: "",
    status: "",
    startDate: "",
    endDate: "",
  })
  const [searchInput, setSearchInput] = useState("")
  const [confirmTarget, setConfirmTarget] = useState<{
    user: UserListItem
    nextStatus: UserStatus
  } | null>(null)

  const usersQuery = useGetUsers(filters)
  const updateStatusMutation = useUpdateUserStatus()

  const users = usersQuery.data?.data ?? []
  const total = usersQuery.data?.pagination?.total ?? 0
  const totalPages = usersQuery.data?.pagination?.totalPages ?? 1
  const currentPage = filters.page ?? 1
  const startDate = parseFilterDate(filters.startDate)
  const endDate = parseFilterDate(filters.endDate)

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

  const handleFilterChange = (key: keyof GetUsersParams, value: string) => {
    setFilters((prev) => ({ ...prev, page: 1, [key]: value }))
  }

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const openConfirm = (user: UserListItem) => {
    const nextStatus: UserStatus =
      user.status === "active" ? "banned" : "active"
    setConfirmTarget({ user, nextStatus })
  }

  const handleConfirmStatus = async () => {
    if (!confirmTarget) return
    try {
      await updateStatusMutation.mutateAsync({
        userId: confirmTarget.user.id,
        status: confirmTarget.nextStatus,
      })
    } catch (error) {
      toast.error(getErrorMessage(error, "Cập nhật thất bại."))
    } finally {
      setConfirmTarget(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Quản lý người dùng
          </h1>
          <p className="text-sm text-muted-foreground">
            Tổng cộng{" "}
            <span className="font-medium text-foreground">{total}</span> tài
            khoản
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => usersQuery.refetch()}
          disabled={usersQuery.isFetching}
          className="hidden sm:inline-flex"
        >
          <RefreshCw
            className={usersQuery.isFetching ? "size-4 animate-spin" : "size-4"}
          />
          Làm mới
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-3">
        </CardHeader>
        <CardContent>
          <form
            onSubmit={applySearch}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(200px,1fr)_160px_170px_240px_auto]"
          >
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Tìm kiếm</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 pr-8 pl-9"
                  placeholder="Tên, email, số điện thoại..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
                {searchInput ? (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Xoá tìm kiếm"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs text-muted-foreground">Vai trò</Label>
              <Select
                value={filters.role || ALL_FILTER_VALUE}
                onValueChange={(value) =>
                  handleFilterChange(
                    "role",
                    value === ALL_FILTER_VALUE ? "" : value
                  )
                }
              >
                <SelectTrigger className="h-9 w-full data-[size=default]:h-9">
                  <SelectValue placeholder="Tất cả vai trò" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
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
                <SelectTrigger className="h-9 w-full data-[size=default]:h-9">
                  <SelectValue placeholder="Tất cả trạng thái" />
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

            <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
              <Label className="text-xs text-muted-foreground">
                Khoảng ngày tạo
              </Label>
              <DateRangePicker
                value={{ from: startDate, to: endDate }}
                onChange={(range) => {
                  setFilters((prev) => ({
                    ...prev,
                    page: 1,
                    startDate: formatFilterDate(range?.from),
                    endDate: formatFilterDate(range?.to),
                  }))
                }}
                buttonClassName="h-9 w-full data-[size=default]:h-9"
              />
            </div>

            <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 flex-1 sm:hidden"
                onClick={() => usersQuery.refetch()}
                disabled={usersQuery.isFetching}
                aria-label="Làm mới"
              >
                <RefreshCw
                  className={
                    usersQuery.isFetching
                      ? "size-4 animate-spin"
                      : "size-4"
                  }
                />
                <span>Làm mới</span>
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-9 flex-1 lg:w-full"
                disabled={
                  !filters.role &&
                  !filters.status &&
                  !filters.startDate &&
                  !filters.endDate &&
                  !filters.search
                }
                onClick={() => {
                  setSearchInput("")
                  setFilters({
                    page: 1,
                    limit: PAGE_SIZE,
                    search: "",
                    role: "",
                    status: "",
                    startDate: "",
                    endDate: "",
                  })
                }}
                aria-label="Xóa bộ lọc"
              >
                <X className="size-4" />
                <span className="sm:hidden">Xóa bộ lọc</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden md:hidden">
        <div className="divide-y">
          {usersQuery.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Không tìm thấy người dùng nào.
            </div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <UserAvatar user={user} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {user.full_name ?? "—"}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                      <StatusBadge status={user.status} />
                    </div>
                    {user.phone ? (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {user.phone}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {(user.roles ?? [user.role].filter(Boolean)).map((r) => (
                    <Badge key={r} variant="outline" className="capitalize">
                      {r}
                    </Badge>
                  ))}
                  <PlanBadge code={user.meta_data?.pricing_plan_code ?? undefined} />
                  {user.verify_email ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                      <BadgeCheck className="size-3.5" />
                      Đã XM
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Chưa XM
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <div className="flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      <span>Đăng nhập cuối</span>
                    </div>
                    <div className="mt-0.5 text-foreground">
                      {formatDate(user.last_login)}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      <span>Ngày đăng ký</span>
                    </div>
                    <div className="mt-0.5 text-foreground">
                      {formatDate(user.created_at)}
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={user.status === "active" ? "outline" : "default"}
                  className={
                    user.status === "active"
                      ? "w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40 dark:hover:text-red-200"
                      : "w-full"
                  }
                  onClick={() => openConfirm(user)}
                  disabled={updateStatusMutation.isPending}
                >
                  {user.status === "active" ? "Khóa tài khoản" : "Mở khóa"}
                </Button>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 ? (
          <div className="flex flex-col gap-2 border-t px-4 py-3">
            <p className="text-center text-xs text-muted-foreground">
              Trang {currentPage} / {totalPages} — {total} kết quả
            </p>
            <div className="flex items-center justify-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || usersQuery.isFetching}
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
                    disabled={usersQuery.isFetching}
                  >
                    {page}
                  </Button>
                )
              })}
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || usersQuery.isFetching}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <Table>
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  Người dùng
                </th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  SĐT
                </th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  Vai trò
                </th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  Email XM
                </th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  Gói
                </th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3.5" />
                    Đăng nhập cuối
                  </span>
                </th>
                <th className="px-4 py-3 text-left font-medium whitespace-nowrap text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3.5" />
                    Ngày đăng ký
                  </span>
                </th>
                <th className="px-4 py-3 text-right font-medium whitespace-nowrap text-muted-foreground">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.isLoading ? (
                <UserTableSkeleton />
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-16 text-center text-muted-foreground"
                  >
                    Không tìm thấy người dùng nào.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b transition-colors last:border-b-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={user} />
                        <span className="max-w-[140px] truncate font-medium">
                          {user.full_name ?? "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="max-w-[180px] truncate text-muted-foreground">
                        {user.email}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(user.roles ?? [user.role].filter(Boolean)).map(
                          (r) => (
                            <Badge
                              key={r}
                              variant="outline"
                              className="capitalize"
                            >
                              {r}
                            </Badge>
                          )
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-4 py-3">
                      {user.verify_email ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <BadgeCheck className="size-4" />
                          <span className="text-xs">Đã XM</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Chưa XM
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <PlanBadge code={user.meta_data?.pricing_plan_code ?? undefined} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(user.last_login)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant={
                          user.status === "active" ? "outline" : "default"
                        }
                        className={
                          user.status === "active"
                            ? "border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40 dark:hover:text-red-200"
                            : ""
                        }
                        onClick={() => openConfirm(user)}
                        disabled={updateStatusMutation.isPending}
                      >
                        {user.status === "active" ? "Khóa" : "Mở khóa"}
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
                disabled={currentPage <= 1 || usersQuery.isFetching}
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
                    disabled={usersQuery.isFetching}
                  >
                    {page}
                  </Button>
                )
              })}

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || usersQuery.isFetching}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      {confirmTarget ? (
        <ConfirmDialog
          user={confirmTarget.user}
          nextStatus={confirmTarget.nextStatus}
          onConfirm={handleConfirmStatus}
          onCancel={() => setConfirmTarget(null)}
          isPending={updateStatusMutation.isPending}
        />
      ) : null}
    </div>
  )
}
