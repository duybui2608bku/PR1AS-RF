"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  CalendarCheck2,
  CheckCircle2,
  Loader2,
  MessageSquare,
  PlayCircle,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { AuthGuard } from "@/components/auth/auth-guard"
import { SiteLayout } from "@/components/layout/site-layout"
import { Badge } from "@/components/ui/badge"
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
import { Table } from "@/components/ui/table"
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
        buildStatusAction(BookingStatus.COMPLETED),
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

export default function WorkerBookingsPage() {
  const router = useRouter()
  const [page, setPage] = React.useState(1)
  const [statusFilter, setStatusFilter] = React.useState<"all" | BookingStatus>(
    "all"
  )
  const [serviceCodeInput, setServiceCodeInput] = React.useState("")
  const [serviceCodeFilter, setServiceCodeFilter] = React.useState("")
  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined)
  const [actionTarget, setActionTarget] = React.useState<{
    booking: Booking
    action: WorkerBookingAction
  } | null>(null)
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
      start_date: startDate ? startDate.toISOString() : undefined,
      end_date: endDate ? endDate.toISOString() : undefined,
    }),
    [page, statusFilter, serviceCodeFilter, startDate, endDate]
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

  const applyServiceCodeFilter = () => {
    setServiceCodeFilter(serviceCodeInput.trim().toUpperCase())
    setPage(1)
  }

  const handleResetFilters = () => {
    setStatusFilter("all")
    setServiceCodeInput("")
    setServiceCodeFilter("")
    setStartDate(undefined)
    setEndDate(undefined)
    setPage(1)
  }

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

  const renderActionButtons = (booking: Booking) => {
    const bookingId = getBookingId(booking)
    const expired = isBookingExpired(booking.schedule, booking.status)
    const actions = getAvailableActions(booking, expired)
    const complaintLoading = complaintLoadingId === bookingId

    return (
      <div className="flex flex-wrap justify-end gap-2">
        {booking.status === BookingStatus.DISPUTED ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpenComplaintGroup(booking)}
            disabled={complaintLoading}
          >
            {complaintLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MessageSquare className="size-4" />
            )}
            Nhóm khiếu nại
          </Button>
        ) : null}
        {actions.map((action) => {
          const Icon = getActionIcon(action)
          return (
            <Button
              key={`${bookingId}-${action.type}-${
                action.type === "status" ? action.status : action.type
              }`}
              size="sm"
              variant={action.destructive ? "destructive" : "outline"}
              onClick={() => setActionTarget({ booking, action })}
            >
              <Icon className="size-4" />
              {action.confirmLabel}
            </Button>
          )
        })}
      </div>
    )
  }

  return (
    <SiteLayout>
      <AuthGuard>
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
                <CalendarCheck2 className="size-7" />
                Booking nhận việc
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Quản lý booking khách hàng đã đặt với vai trò worker
              </p>
            </div>
            <Button
              variant="outline"
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

          <Card className="mb-5">
            <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_1.2fr_1fr_1fr_auto]">
              <div className="grid gap-2">
                <Label htmlFor="worker-filter-status">Trạng thái</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as "all" | BookingStatus)
                    setPage(1)
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
                <div className="flex gap-2">
                  <Input
                    id="worker-filter-service"
                    value={serviceCodeInput}
                    maxLength={40}
                    placeholder="VD: CLEANING"
                    onChange={(event) =>
                      setServiceCodeInput(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") applyServiceCodeFilter()
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Lọc theo mã dịch vụ"
                    onClick={applyServiceCodeFilter}
                  >
                    <Search className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Từ ngày</Label>
                <DatePicker
                  value={startDate}
                  onChange={(date) => {
                    setStartDate(date)
                    setPage(1)
                  }}
                  toDate={endDate}
                />
              </div>
              <div className="grid gap-2">
                <Label>Đến ngày</Label>
                <DatePicker
                  value={endDate}
                  onChange={(date) => {
                    setEndDate(date)
                    setPage(1)
                  }}
                  fromDate={startDate}
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleResetFilters}
                >
                  Đặt lại
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-muted/30">
              <CardTitle className="text-base">Danh sách booking</CardTitle>
              <Badge variant="outline">{total}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {bookingsQuery.isLoading ? (
                <div className="flex min-h-48 items-center justify-center">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
              ) : bookingsQuery.isError ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-4 text-center">
                  <AlertCircle className="size-9 text-red-600" />
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
                <>
                  <div className="md:hidden">
                    {bookings.map((booking) => {
                      const expired = isBookingExpired(
                        booking.schedule,
                        booking.status
                      )
                      const displayStatus = expired
                        ? BookingStatus.EXPIRED
                        : booking.status
                      return (
                        <div
                          key={getBookingId(booking)}
                          className="border-b p-4 last:border-b-0"
                        >
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="truncate leading-tight font-semibold">
                                {getServiceLabel(booking)}
                              </div>
                              <div className="text-xs text-muted-foreground uppercase">
                                {booking.service_code}
                              </div>
                            </div>
                            <span
                              className={cn(
                                "inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
                                bookingStatusBadgeClass[displayStatus]
                              )}
                            >
                              {bookingStatusLabel[displayStatus]}
                            </span>
                          </div>
                          <dl className="grid gap-2 text-sm">
                            <div>
                              <dt className="text-xs text-muted-foreground">
                                Khách hàng
                              </dt>
                              <dd className="font-medium">
                                {getClientName(booking.client_id)}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs text-muted-foreground">
                                Lịch hẹn
                              </dt>
                              <dd className="font-medium">
                                {formatDateTime(booking.schedule.start_time)}
                              </dd>
                              <dd className="text-xs text-muted-foreground">
                                Thời lượng: {booking.schedule.duration_hours}{" "}
                                giờ
                              </dd>
                            </div>
                            {booking.client_notes ? (
                              <div>
                                <dt className="text-xs text-muted-foreground">
                                  Ghi chú khách hàng
                                </dt>
                                <dd className="whitespace-pre-wrap">
                                  {booking.client_notes}
                                </dd>
                              </div>
                            ) : null}
                            {booking.worker_response ? (
                              <div>
                                <dt className="text-xs text-muted-foreground">
                                  Phản hồi của bạn
                                </dt>
                                <dd className="whitespace-pre-wrap">
                                  {booking.worker_response}
                                </dd>
                              </div>
                            ) : null}
                          </dl>
                          <div className="mt-3 border-t pt-3">
                            {renderActionButtons(booking)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="hidden overflow-x-auto md:block">
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
                            booking.status
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
                                {renderActionButtons(booking)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </Table>
                  </div>
                </>
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
        </div>
      </AuthGuard>
    </SiteLayout>
  )
}
