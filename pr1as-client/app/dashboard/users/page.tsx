"use client"

import { useState, useCallback, type FormEvent } from "react"
import Image from "next/image"
import {
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useGetUsers, useUpdateUserStatus } from "@/lib/hooks/use-users"
import type {
  GetUsersParams,
  UserListItem,
  UserRole,
  UserStatus,
} from "@/services/user.service"
import { getErrorMessage } from "@/lib/utils/error-handler"

const PAGE_SIZE = 10

const ROLE_OPTIONS: { label: string; value: UserRole | "" }[] = [
  { label: "Tất cả vai trò", value: "" },
  { label: "Client", value: "client" },
  { label: "Worker", value: "worker" },
  { label: "Admin", value: "admin" },
]

const STATUS_OPTIONS: { label: string; value: UserStatus | "" }[] = [
  { label: "Tất cả trạng thái", value: "" },
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

function StatusBadge({ status }: { status?: string }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        <ShieldCheck className="size-3" />
        Hoạt động
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
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
      ? "bg-yellow-100 text-yellow-700"
      : lower === "diamond"
        ? "bg-violet-100 text-violet-700"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
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
                ? "border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
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
      <div className="flex items-center justify-between">
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
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Bộ lọc
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={applySearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pr-8 pl-9"
                placeholder="Tìm theo tên, email, số điện thoại..."
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
            <Button type="submit" size="sm">
              Tìm kiếm
            </Button>
          </form>

          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Vai trò</label>
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                value={filters.role ?? ""}
                onChange={(e) => handleFilterChange("role", e.target.value)}
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">
                Trạng thái
              </label>
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                value={filters.status ?? ""}
                onChange={(e) => handleFilterChange("status", e.target.value)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Từ ngày</label>
              <Input
                type="date"
                className="h-9 w-44"
                value={filters.startDate ?? ""}
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Đến ngày</label>
              <Input
                type="date"
                className="h-9 w-44"
                value={filters.endDate ?? ""}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>

            {filters.role ||
            filters.status ||
            filters.startDate ||
            filters.endDate ||
            filters.search ? (
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
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
                >
                  <X className="mr-1 size-4" />
                  Xóa bộ lọc
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
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
                        <span className="inline-flex items-center gap-1 text-emerald-600">
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
                      <PlanBadge code={user.pricing_plan_code} />
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
                            ? "border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
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
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t px-4 py-3">
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
