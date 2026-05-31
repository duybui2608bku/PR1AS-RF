"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  CalendarCheck2,
  CheckCircle2,
  FilterX,
  Loader2,
  MessageSquare,
  PlayCircle,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import type { DateRange } from "react-day-picker"

import { AuthGuard } from "@/components/auth/auth-guard"
import { SiteLayout } from "@/components/layout/site-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table } from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  useCancelBooking,
  useMyBookings,
  useUpdateBooking,
  useUpdateBookingStatus,
} from "@/lib/hooks/use-bookings"
import { useCreateComplaintConversation } from "@/lib/hooks/use-chat"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/utils/error-handler"
import {
  BookingStatus,
  type Booking,
  type BookingListQuery,
  type CancelBookingPayload,
  type UpdateBookingPayload,
  type UpdateBookingStatusPayload,
} from "@/types/booking"

import {
  WorkerBookingActionDialog,
  type WorkerBookingAction,
} from "./components/worker-booking-action-dialog"
import {
  WorkerBookingActionSheet,
  type WorkerBookingSheetItem,
} from "./components/worker-booking-action-sheet"
import { WorkerBookingCard } from "./components/worker-booking-card"
import { WorkerBookingsMobileFilters } from "./components/worker-bookings-mobile-filters"
import {
  bookingStatusBadgeClass,
  bookingStatusLabel,
  formatDateTime,
  getBookingId,
  getClientName,
  getServiceLabel,
  isBookingExpired,
} from "./format"

const PAGE_SIZE = 10

const STATUS_OPTIONS: { value: "all" | BookingStatus; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái" },
  {
    value: BookingStatus.PENDING,
    label: bookingStatusLabel[BookingStatus.PENDING],
  },
  {
    value: BookingStatus.CONFIRMED,
    label: bookingStatusLabel[BookingStatus.CONFIRMED],
  },
  {
    value: BookingStatus.IN_PROGRESS,
    label: bookingStatusLabel[BookingStatus.IN_PROGRESS],
  },
  {
    value: BookingStatus.PENDING_CLIENT_ACCEPTANCE,
    label: bookingStatusLabel[BookingStatus.PENDING_CLIENT_ACCEPTANCE],
  },
  {
    value: BookingStatus.COMPLETED,
    label: bookingStatusLabel[BookingStatus.COMPLETED],
  },
  {
    value: BookingStatus.CANCELLED,
    label: bookingStatusLabel[BookingStatus.CANCELLED],
  },
  {
    value: BookingStatus.REJECTED,
    label: bookingStatusLabel[BookingStatus.REJECTED],
  },
  {
    value: BookingStatus.DISPUTED,
    label: bookingStatusLabel[BookingStatus.DISPUTED],
  },
  {
    value: BookingStatus.EXPIRED,
    label: bookingStatusLabel[BookingStatus.EXPIRED],
  },
]

const buildStatusAction = (status: BookingStatus): WorkerBookingAction => {
  switch (status) {
    case BookingStatus.CONFIRMED:
      return {
        type: "status",
        status,
        title: "Xác nhận booking",
        description: "Booking sẽ chuyển sang trạng thái đã xác nhận.",
        confirmLabel: "Xác nhận",
      }
    case BookingStatus.REJECTED:
      return {
        type: "status",
        status,
        title: "Từ chối booking",
        description: "Booking sẽ bị từ chối và không thể tiếp tục xử lý.",
        confirmLabel: "Từ chối",
        destructive: true,
      }
    case BookingStatus.IN_PROGRESS:
      return {
        type: "status",
        status,
        title: "Bắt đầu booking",
        description: "Booking sẽ chuyển sang trạng thái đang thực hiện.",
        confirmLabel: "Bắt đầu",
      }
    case BookingStatus.PENDING_CLIENT_ACCEPTANCE:
      return {
        type: "status",
        status,
        title: "Gửi xác nhận hoàn thành",
        description:
          "Booking sẽ chuyển sang trạng thái chờ khách hàng xác nhận hoàn thành.",
        confirmLabel: "Gửi xác nhận",
      }
    case BookingStatus.COMPLETED:
      return {
        type: "status",
        status,
        title: "Hoàn thành booking",
        description: "Xác nhận booking đã hoàn thành cho khách hàng.",
        confirmLabel: "Hoàn thành",
      }
    default:
      return {
        type: "status",
        status,
        title: "Cập nhật booking",
        description: "Trạng thái booking sẽ được cập nhật.",
        confirmLabel: "Cập nhật",
      }
  }
}

const cancelAction: WorkerBookingAction = {
  type: "cancel",
  title: "Hủy booking",
  description: "Vui lòng chọn lý do hủy để khách hàng nắm được tình trạng.",
  confirmLabel: "Xác nhận hủy",
  destructive: true,
}

const buildResponseAction = (booking: Booking): WorkerBookingAction => ({
  type: "response",
  title: "Cập nhật phản hồi",
  description: "Phản hồi này sẽ hiển thị cho khách hàng trong booking.",
  confirmLabel: "Lưu phản hồi",
  initialResponse: booking.worker_response ?? "",
})

function getAvailableActions(
  booking: Booking,
  expired: boolean
): WorkerBookingAction[] {
  if (expired) return []

  switch (booking.status) {
    case BookingStatus.PENDING:
      return [
        buildStatusAction(BookingStatus.CONFIRMED),
        buildStatusAction(BookingStatus.REJECTED),
        buildResponseAction(booking),
        cancelAction,
      ]
    case BookingStatus.CONFIRMED:
      return [
        buildStatusAction(BookingStatus.IN_PROGRESS),
        buildResponseAction(booking),
        cancelAction,
      ]
    case BookingStatus.IN_PROGRESS:
      return [
        buildStatusAction(BookingStatus.PENDING_CLIENT_ACCEPTANCE),
        buildResponseAction(booking),
        cancelAction,
      ]
    default:
      return []
  }
}

function getActionIcon(action: WorkerBookingAction) {
  if (action.type === "cancel") return XCircle
  if (action.type === "response") return MessageSquare
  if (action.status === BookingStatus.IN_PROGRESS) return PlayCircle
  if (action.status === BookingStatus.REJECTED) return XCircle
  return CheckCircle2
}

function getActionValue(action: WorkerBookingAction) {
  return action.type === "status" ? `status-${action.status}` : action.type
}

export default function WorkerBookingsPage() {
  const router = useRouter()
  const [page, setPage] = React.useState(1)
  // UI state (chưa apply)
  const [statusInput, setStatusInput] = React.useState<"all" | BookingStatus>(
    "all"
  )
  const [serviceCodeInput, setServiceCodeInput] = React.useState("")
  const [dateRangeInput, setDateRangeInput] = React.useState<
    DateRange | undefined
  >(undefined)
  // Applied state (dùng trong query)
  const [statusFilter, setStatusFilter] = React.useState<"all" | BookingStatus>(
    "all"
  )
  const [serviceCodeFilter, setServiceCodeFilter] = React.useState("")
  const [dateRangeFilter, setDateRangeFilter] = React.useState<
    DateRange | undefined
  >(undefined)
  const [actionTarget, setActionTarget] = React.useState<{
    booking: Booking
    action: WorkerBookingAction
  } | null>(null)
  const [sheetBooking, setSheetBooking] = React.useState<Booking | null>(null)
  const [complaintLoadingId, setComplaintLoadingId] = React.useState<
    string | null
  >(null)

  const query = React.useMemo<BookingListQuery>(
    () => ({
      page,
      limit: PAGE_SIZE,
      role: "worker",
      status: statusFilter === "all" ? undefined : statusFilter,
      service_code: serviceCodeFilter || undefined,
      start_date: dateRangeFilter?.from
        ? dateRangeFilter.from.toISOString()
        : undefined,
      end_date: dateRangeFilter?.to
        ? dateRangeFilter.to.toISOString()
        : undefined,
    }),
    [page, statusFilter, serviceCodeFilter, dateRangeFilter]
  )

  const bookingsQuery = useMyBookings(query)
  const updateStatusMutation = useUpdateBookingStatus()
  const updateBookingMutation = useUpdateBooking()
  const cancelMutation = useCancelBooking()
  const complaintMutation = useCreateComplaintConversation()

  const bookings = bookingsQuery.data?.data ?? []
  const pagination = bookingsQuery.data?.pagination
  const totalPages = pagination?.totalPages ?? 0
  const total = pagination?.total ?? 0
  const canGoBack = page > 1
  const canGoNext = totalPages ? page < totalPages : false

  const handleApplyFilters = () => {
    setStatusFilter(statusInput)
    setServiceCodeFilter(serviceCodeInput.trim().toUpperCase())
    setDateRangeFilter(dateRangeInput)
    setPage(1)
  }

  const handleResetFilters = () => {
    setStatusInput("all")
    setStatusFilter("all")
    setServiceCodeInput("")
    setServiceCodeFilter("")
    setDateRangeInput(undefined)
    setDateRangeFilter(undefined)
    setPage(1)
  }

  // Mobile: chip áp dụng ngay trạng thái
  const handleMobileStatusChange = (value: "all" | BookingStatus) => {
    setStatusInput(value)
    setStatusFilter(value)
    setPage(1)
  }

  const advancedFilterCount =
    (serviceCodeFilter ? 1 : 0) + (dateRangeFilter?.from ? 1 : 0)

  const handleStatusSubmit = async (values: UpdateBookingStatusPayload) => {
    if (!actionTarget) return
    await updateStatusMutation.mutateAsync({
      id: getBookingId(actionTarget.booking),
      payload: values,
    })
    setActionTarget(null)
  }

  const handleCancelSubmit = async (values: CancelBookingPayload) => {
    if (!actionTarget) return
    await cancelMutation.mutateAsync({
      id: getBookingId(actionTarget.booking),
      payload: values,
    })
    setActionTarget(null)
  }

  const handleResponseSubmit = async (values: UpdateBookingPayload) => {
    if (!actionTarget) return
    await updateBookingMutation.mutateAsync({
      id: getBookingId(actionTarget.booking),
      payload: values,
    })
    setActionTarget(null)
  }

  const handleOpenComplaintGroup = async (booking: Booking) => {
    const bookingId = getBookingId(booking)
    setComplaintLoadingId(bookingId)
    try {
      const conversation = await complaintMutation.mutateAsync(bookingId)
      router.push(`/chat/group?group=${conversation._id}`)
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể mở nhóm khiếu nại."))
    } finally {
      setComplaintLoadingId(null)
    }
  }

  const renderActionSelect = (booking: Booking) => {
    const bookingId = getBookingId(booking)
    const expired = isBookingExpired(
      booking.schedule,
      booking.status,
      booking.created_at
    )
    const actions = getAvailableActions(booking, expired)
    const complaintLoading = complaintLoadingId === bookingId
    const hasComplaintAction = booking.status === BookingStatus.DISPUTED
    const hasActions = hasComplaintAction || actions.length > 0

    if (!hasActions) {
      return (
        <div className="flex justify-end">
          <Select disabled value="none">
            <SelectTrigger className="h-9 w-full min-w-40 text-muted-foreground data-[size=default]:h-9 md:w-44">
              <SelectValue placeholder="Không có hành động" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Không có hành động</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )
    }

    const handleActionChange = (value: string) => {
      if (value === "complaint") {
        handleOpenComplaintGroup(booking)
        return
      }

      const selectedAction = actions.find(
        (action) => getActionValue(action) === value
      )

      if (selectedAction) {
        setActionTarget({ booking, action: selectedAction })
      }
    }

    return (
      <div className="flex justify-end">
        <Select
          value=""
          onValueChange={handleActionChange}
          disabled={complaintLoading}
        >
          <SelectTrigger
            aria-label="Chọn hành động booking"
            className="h-9 w-full min-w-40 cursor-pointer px-3 data-[size=default]:h-9 md:w-44"
          >
            {complaintLoading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : null}
            <SelectValue placeholder="Chọn hành động" />
          </SelectTrigger>
          <SelectContent align="end" className="min-w-52">
            {hasComplaintAction ? (
              <SelectItem
                value="complaint"
                className="cursor-pointer py-2 pr-8 pl-2.5"
              >
                <MessageSquare className="size-4" />
                Nhóm khiếu nại
              </SelectItem>
            ) : null}
            {actions.map((action) => {
              const Icon = getActionIcon(action)
              const actionValue = getActionValue(action)

              return (
                <SelectItem
                  key={`${bookingId}-${actionValue}`}
                  value={actionValue}
                  className={cn(
                    "cursor-pointer py-2 pr-8 pl-2.5",
                    action.destructive &&
                      "text-destructive focus:text-destructive"
                  )}
                >
                  <Icon className="size-4" />
                  {action.confirmLabel}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>
    )
  }

  const sheetItems: WorkerBookingSheetItem[] = []
  if (sheetBooking) {
    const booking = sheetBooking
    const bookingId = getBookingId(booking)
    const expired = isBookingExpired(
      booking.schedule,
      booking.status,
      booking.created_at
    )
    if (booking.status === BookingStatus.DISPUTED) {
      sheetItems.push({
        key: "complaint",
        label: "Mở nhóm khiếu nại",
        icon: MessageSquare,
        loading: complaintLoadingId === bookingId,
        onSelect: () => {
          setSheetBooking(null)
          handleOpenComplaintGroup(booking)
        },
      })
    }
    getAvailableActions(booking, expired).forEach((action) => {
      sheetItems.push({
        key: getActionValue(action),
        label: action.confirmLabel,
        icon: getActionIcon(action),
        destructive: action.destructive,
        onSelect: () => {
          setSheetBooking(null)
          setActionTarget({ booking, action })
        },
      })
    })
  }

  return (
    <SiteLayout>
      <AuthGuard>
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="mb-5 md:mb-6">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
              <CalendarCheck2 className="size-6 md:size-7" />
              Booking nhận việc
            </h1>
          </div>

          <Card className="mb-5 hidden md:block">
            <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_1.2fr_1.5fr_auto]">
              <div className="grid gap-2">
                <Label htmlFor="worker-filter-status">Trạng thái</Label>
                <Select
                  value={statusInput}
                  onValueChange={(value) => {
                    setStatusInput(value as "all" | BookingStatus)
                  }}
                >
                  <SelectTrigger
                    id="worker-filter-status"
                    className="h-10 w-full data-[size=default]:h-10"
                  >
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="worker-filter-service">Mã dịch vụ</Label>
                <Input
                  id="worker-filter-service"
                  value={serviceCodeInput}
                  maxLength={40}
                  placeholder="VD: CLEANING"
                  onChange={(event) => setServiceCodeInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleApplyFilters()
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label>Khoảng ngày</Label>
                <DateRangePicker
                  value={dateRangeInput}
                  onChange={setDateRangeInput}
                  numberOfMonths={2}
                  align="start"
                />
              </div>
              <div className="flex items-end gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleResetFilters}
                        aria-label="Xoá bộ lọc"
                      >
                        <FilterX className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Xoá bộ lọc</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button className="flex-1" onClick={handleApplyFilters}>
                  <Search className="size-4" />
                  Tìm kiếm
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Mobile: bộ lọc nhanh + danh sách dạng card */}
          <div className="md:hidden">
            <WorkerBookingsMobileFilters
              statusOptions={STATUS_OPTIONS}
              statusValue={statusFilter}
              onStatusChange={handleMobileStatusChange}
              serviceCode={serviceCodeInput}
              onServiceCodeChange={setServiceCodeInput}
              dateRange={dateRangeInput}
              onDateRangeChange={setDateRangeInput}
              advancedFilterCount={advancedFilterCount}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
            />

            <div className="mt-4 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Danh sách booking</span>
                <Badge variant="outline">{total}</Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => bookingsQuery.refetch()}
                disabled={bookingsQuery.isFetching}
                aria-label="Làm mới danh sách"
              >
                <RefreshCw
                  className={cn(
                    "size-4",
                    bookingsQuery.isFetching && "animate-spin"
                  )}
                />
              </Button>
            </div>

            {bookingsQuery.isLoading ? (
              <div className="flex min-h-48 items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : bookingsQuery.isError ? (
              <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-4 text-center">
                <AlertCircle className="size-9 text-red-600 dark:text-red-400" />
                <p className="text-sm font-medium">
                  Không tải được danh sách booking worker
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => bookingsQuery.refetch()}
                >
                  Thử lại
                </Button>
              </div>
            ) : bookings.length === 0 ? (
              <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-4 text-center">
                <CalendarCheck2 className="size-9 text-muted-foreground" />
                <p className="text-sm font-medium">Chưa có booking nào</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => {
                  const bookingId = getBookingId(booking)
                  const expired = isBookingExpired(
                    booking.schedule,
                    booking.status,
                    booking.created_at
                  )
                  const actions = getAvailableActions(booking, expired)
                  const hasActions =
                    booking.status === BookingStatus.DISPUTED ||
                    actions.length > 0
                  return (
                    <WorkerBookingCard
                      key={bookingId}
                      booking={booking}
                      hasActions={hasActions}
                      actionLoading={complaintLoadingId === bookingId}
                      onOpenActions={setSheetBooking}
                    />
                  )
                })}
              </div>
            )}
          </div>

          <Card className="hidden md:block">
            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Danh sách booking</CardTitle>
                <Badge variant="outline">{total}</Badge>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => bookingsQuery.refetch()}
                      disabled={bookingsQuery.isFetching}
                      aria-label="Làm mới danh sách"
                    >
                      <RefreshCw
                        className={cn(
                          "size-4",
                          bookingsQuery.isFetching && "animate-spin"
                        )}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Làm mới</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardHeader>
            <CardContent className="p-0">
              {bookingsQuery.isLoading ? (
                <div className="flex min-h-48 items-center justify-center">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
              ) : bookingsQuery.isError ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-4 text-center">
                  <AlertCircle className="size-9 text-red-600 dark:text-red-400" />
                  <p className="text-sm font-medium">
                    Không tải được danh sách booking worker
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => bookingsQuery.refetch()}
                  >
                    Thử lại
                  </Button>
                </div>
              ) : bookings.length === 0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-4 text-center">
                  <CalendarCheck2 className="size-9 text-muted-foreground" />
                  <p className="text-sm font-medium">Chưa có booking nào</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-[980px]">
                      <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground uppercase">
                        <tr>
                          <th className="px-4 py-3 font-medium">Dịch vụ</th>
                          <th className="px-4 py-3 font-medium">Khách hàng</th>
                          <th className="px-4 py-3 font-medium">Lịch hẹn</th>
                          <th className="px-4 py-3 font-medium">Trạng thái</th>
                          <th className="px-4 py-3 font-medium">Ghi chú</th>
                          <th className="px-4 py-3 text-right font-medium">
                            Hành động
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map((booking) => {
                          const expired = isBookingExpired(
                            booking.schedule,
                            booking.status,
                            booking.created_at
                          )
                          const displayStatus = expired
                            ? BookingStatus.EXPIRED
                            : booking.status

                          return (
                            <tr
                              key={getBookingId(booking)}
                              className="border-b align-top last:border-b-0"
                            >
                              <td className="px-4 py-3">
                                <div className="font-medium">
                                  {getServiceLabel(booking)}
                                </div>
                                <div className="text-xs text-muted-foreground uppercase">
                                  {booking.service_code}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {getClientName(booking.client_id)}
                              </td>
                              <td className="px-4 py-3">
                                <div>
                                  {formatDateTime(booking.schedule.start_time)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Thời lượng: {booking.schedule.duration_hours}{" "}
                                  giờ
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={cn(
                                    "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                                    bookingStatusBadgeClass[displayStatus]
                                  )}
                                >
                                  {bookingStatusLabel[displayStatus]}
                                </span>
                              </td>
                              <td className="max-w-[260px] px-4 py-3 text-sm text-muted-foreground">
                                <div className="space-y-2">
                                  <div className="line-clamp-3 whitespace-pre-wrap">
                                    {booking.client_notes || "-"}
                                  </div>
                                  {booking.worker_response ? (
                                    <div className="line-clamp-3 border-t pt-2 whitespace-pre-wrap">
                                      <span className="font-medium text-foreground">
                                        Phản hồi:{" "}
                                      </span>
                                      {booking.worker_response}
                                    </div>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {renderActionSelect(booking)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {bookings.length > 0 ? (
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={!canGoBack}
              >
                Trước
              </Button>
              <span className="text-sm text-muted-foreground">
                {page}/{Math.max(totalPages, 1)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((value) => value + 1)}
                disabled={!canGoNext}
              >
                Sau
              </Button>
            </div>
          ) : null}

          <WorkerBookingActionDialog
            action={actionTarget?.action ?? null}
            loading={
              updateStatusMutation.isPending ||
              updateBookingMutation.isPending ||
              cancelMutation.isPending
            }
            onOpenChange={(open) => {
              if (!open) setActionTarget(null)
            }}
            onStatusSubmit={handleStatusSubmit}
            onResponseSubmit={handleResponseSubmit}
            onCancelSubmit={handleCancelSubmit}
          />

          <WorkerBookingActionSheet
            open={Boolean(sheetBooking)}
            title={sheetBooking ? getServiceLabel(sheetBooking) : ""}
            items={sheetItems}
            onOpenChange={(open) => {
              if (!open) setSheetBooking(null)
            }}
          />
        </div>
      </AuthGuard>
    </SiteLayout>
  )
}
