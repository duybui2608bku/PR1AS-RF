"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  CalendarCheck2,
  Info,
  Loader2,
  MessageSquare,
  MessageSquareWarning,
  RefreshCw,
  Star,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useCancelBooking,
  useCreateDispute,
  useMyBookings,
} from "@/lib/hooks/use-bookings"
import { useCreateComplaintConversation } from "@/lib/hooks/use-chat"
import { useCreateReview } from "@/lib/hooks/use-reviews"
import { useAuthStore } from "@/lib/store/auth-store"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/utils/error-handler"
import {
  BookingStatus,
  type Booking,
  type BookingListQuery,
  type CancelBookingPayload,
  type CreateDisputePayload,
} from "@/types/booking"
import { ReviewType, type ReviewRatingDetails } from "@/types/review"

import { BookingCard } from "./components/booking-card"
import { CancelBookingDialog } from "./components/cancel-booking-dialog"
import { DisputeBookingDialog } from "./components/dispute-booking-dialog"
import { ReviewBookingDialog } from "./components/review-booking-dialog"
import {
  bookingStatusBadgeClass,
  bookingStatusLabel,
  canCancelBooking,
  canComplainBooking,
  cancellationReasonLabel,
  cancelledByLabel,
  formatDateTime,
  getBookingId,
  getRefId,
  getServiceLabel,
  getWorkerName,
  isBookingExpired,
} from "./format"

const PAGE_SIZE = 10

const STATUS_OPTIONS: { value: "all" | BookingStatus; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: BookingStatus.PENDING, label: bookingStatusLabel[BookingStatus.PENDING] },
  { value: BookingStatus.CONFIRMED, label: bookingStatusLabel[BookingStatus.CONFIRMED] },
  { value: BookingStatus.IN_PROGRESS, label: bookingStatusLabel[BookingStatus.IN_PROGRESS] },
  { value: BookingStatus.COMPLETED, label: bookingStatusLabel[BookingStatus.COMPLETED] },
  { value: BookingStatus.CANCELLED, label: bookingStatusLabel[BookingStatus.CANCELLED] },
  { value: BookingStatus.REJECTED, label: bookingStatusLabel[BookingStatus.REJECTED] },
  { value: BookingStatus.DISPUTED, label: bookingStatusLabel[BookingStatus.DISPUTED] },
]

export default function ClientBookingsPage() {
  const [page, setPage] = React.useState(1)
  const [statusFilter, setStatusFilter] = React.useState<"all" | BookingStatus>("all")
  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined)

  const [cancelTarget, setCancelTarget] = React.useState<Booking | null>(null)
  const [disputeTarget, setDisputeTarget] = React.useState<Booking | null>(null)
  const [reviewTarget, setReviewTarget] = React.useState<Booking | null>(null)
  const [complaintLoadingId, setComplaintLoadingId] = React.useState<string | null>(
    null,
  )

  const router = useRouter()
  const currentUserId = useAuthStore((state) => state.user?.id ?? null)

  const query = React.useMemo<BookingListQuery>(() => ({
    page,
    limit: PAGE_SIZE,
    role: "client",
    status: statusFilter === "all" ? undefined : statusFilter,
    start_date: startDate ? startDate.toISOString() : undefined,
    end_date: endDate ? endDate.toISOString() : undefined,
  }), [page, statusFilter, startDate, endDate])

  const bookingsQuery = useMyBookings(query)
  const cancelMutation = useCancelBooking()
  const disputeMutation = useCreateDispute()
  const reviewMutation = useCreateReview()
  const complaintMutation = useCreateComplaintConversation()

  const bookings = bookingsQuery.data?.data ?? []
  const pagination = bookingsQuery.data?.pagination
  const totalPages = pagination?.totalPages ?? 0
  const total = pagination?.total ?? 0
  const canGoBack = page > 1
  const canGoNext = totalPages ? page < totalPages : false

  const handleResetFilters = () => {
    setStatusFilter("all")
    setStartDate(undefined)
    setEndDate(undefined)
    setPage(1)
  }

  const handleCancelSubmit = async (values: CancelBookingPayload) => {
    if (!cancelTarget) return
    await cancelMutation.mutateAsync({
      id: getBookingId(cancelTarget),
      payload: values,
    })
    setCancelTarget(null)
  }

  const handleDisputeSubmit = async (values: CreateDisputePayload) => {
    if (!disputeTarget) return
    await disputeMutation.mutateAsync({
      id: getBookingId(disputeTarget),
      payload: values,
    })
    setDisputeTarget(null)
  }

  const handleReviewSubmit = async (values: {
    rating: number
    rating_details: ReviewRatingDetails
    comment: string
  }) => {
    if (!reviewTarget) return
    if (!currentUserId) {
      toast.error("Bạn cần đăng nhập để đánh giá.")
      return
    }
    const workerId = getRefId(reviewTarget.worker_id)
    if (!workerId) {
      toast.error("Không tìm thấy thợ của booking.")
      return
    }
    await reviewMutation.mutateAsync({
      booking_id: getBookingId(reviewTarget),
      worker_id: workerId,
      client_id: currentUserId,
      review_type: ReviewType.CLIENT_TO_WORKER,
      ...values,
    })
    setReviewTarget(null)
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

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <CalendarCheck2 className="size-7" />
            Booking của tôi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý các booking bạn đã đặt
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
      </div>

      <Card className="mb-5">
        <CardContent className="grid gap-4 p-5 md:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="filter-status">Trạng thái</Label>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as "all" | BookingStatus)
                setPage(1)
              }}
            >
              <SelectTrigger
                id="filter-status"
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
              <p className="text-sm font-medium">Không tải được danh sách booking</p>
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
                  const bookingId = getBookingId(booking)
                  return (
                    <BookingCard
                      key={bookingId}
                      booking={booking}
                      onCancel={setCancelTarget}
                      onDispute={setDisputeTarget}
                      onReview={setReviewTarget}
                      onOpenComplaintGroup={handleOpenComplaintGroup}
                      openingComplaintGroup={complaintLoadingId === bookingId}
                    />
                  )
                })}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[920px] text-sm">
                  <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">Dịch vụ</th>
                      <th className="px-4 py-3 font-medium">Worker</th>
                      <th className="px-4 py-3 font-medium">Lịch hẹn</th>
                      <th className="px-4 py-3 font-medium">Trạng thái</th>
                      <th className="px-4 py-3 font-medium">Ngày tạo</th>
                      <th className="px-4 py-3 font-medium text-right">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => {
                      const expired = isBookingExpired(booking.schedule, booking.status)
                      const displayStatus = expired ? BookingStatus.EXPIRED : booking.status
                      const showCancel = !expired && canCancelBooking(booking.status)
                      const showDispute = !expired && canComplainBooking(booking.status)
                      const showReview = booking.status === BookingStatus.COMPLETED
                      const showComplaintGroup = booking.status === BookingStatus.DISPUTED
                      const bookingId = getBookingId(booking)
                      const complaintLoading = complaintLoadingId === bookingId

                      return (
                        <tr
                          key={bookingId}
                          className="border-b last:border-b-0 align-top"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium">{getServiceLabel(booking)}</div>
                            <div className="text-xs uppercase text-muted-foreground">
                              {booking.service_code}
                            </div>
                          </td>
                          <td className="px-4 py-3">{getWorkerName(booking.worker_id)}</td>
                          <td className="px-4 py-3">
                            <div>{formatDateTime(booking.schedule.start_time)}</div>
                            <div className="text-xs text-muted-foreground">
                              Thời lượng: {booking.schedule.duration_hours} giờ
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="inline-flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                                  bookingStatusBadgeClass[displayStatus],
                                )}
                              >
                                {bookingStatusLabel[displayStatus]}
                              </span>
                              {booking.status === BookingStatus.CANCELLED && booking.cancellation ? (
                                <HoverCard openDelay={100} closeDelay={100}>
                                  <HoverCardTrigger asChild>
                                    <button
                                      type="button"
                                      aria-label="Xem lý do hủy"
                                      className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                                    >
                                      <Info className="size-4" />
                                    </button>
                                  </HoverCardTrigger>
                                  <HoverCardContent align="start" className="text-xs">
                                    <div className="space-y-1.5">
                                      <div>
                                        <span className="text-muted-foreground">Lý do: </span>
                                        <span className="font-medium">
                                          {cancellationReasonLabel[booking.cancellation.reason]}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Bởi: </span>
                                        <span className="font-medium">
                                          {cancelledByLabel[booking.cancellation.cancelled_by]}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">Thời điểm: </span>
                                        <span>{formatDateTime(booking.cancellation.cancelled_at)}</span>
                                      </div>
                                      {booking.cancellation.notes ? (
                                        <div>
                                          <div className="text-muted-foreground">Ghi chú:</div>
                                          <div className="whitespace-pre-wrap">
                                            {booking.cancellation.notes}
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDateTime(booking.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap justify-end gap-2">
                              {showComplaintGroup ? (
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
                                  Mở nhóm khiếu nại
                                </Button>
                              ) : null}
                              {showReview ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setReviewTarget(booking)}
                                >
                                  <Star className="size-4" />
                                  Đánh giá
                                </Button>
                              ) : null}
                              {showDispute ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDisputeTarget(booking)}
                                >
                                  <MessageSquareWarning className="size-4" />
                                  Khiếu nại
                                </Button>
                              ) : null}
                              {showCancel ? (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setCancelTarget(booking)}
                                >
                                  <XCircle className="size-4" />
                                  Hủy
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
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

      <CancelBookingDialog
        open={Boolean(cancelTarget)}
        loading={cancelMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setCancelTarget(null)
        }}
        onSubmit={handleCancelSubmit}
      />
      <DisputeBookingDialog
        open={Boolean(disputeTarget)}
        loading={disputeMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setDisputeTarget(null)
        }}
        onSubmit={handleDisputeSubmit}
      />
      <ReviewBookingDialog
        open={Boolean(reviewTarget)}
        loading={reviewMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setReviewTarget(null)
        }}
        onSubmit={handleReviewSubmit}
      />
    </div>
  )
}
