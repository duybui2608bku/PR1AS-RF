"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  CalendarCheck2,
  CheckCircle2,
  Info,
  Loader2,
  MessageSquare,
  MessageSquareWarning,
  RefreshCw,
  Star,
  XCircle,
} from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { toast } from "sonner"
import type { DateRange } from "react-day-picker"

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
import { Table } from "@/components/ui/table"
import {
  useCancelBooking,
  useCreateDispute,
  useMyBookings,
  useUpdateBookingStatus,
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

import { BookingCountdown } from "@/components/booking/booking-countdown"

import { BookingCard } from "./components/booking-card"
import { CancelBookingDialog } from "./components/cancel-booking-dialog"
import { ClientBookingsMobileFilters } from "./components/client-bookings-mobile-filters"
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
  getConfirmationDeadline,
  getRefId,
  getServiceLabel,
  getWorkerName,
  isBookingExpired,
} from "./format"

const PAGE_SIZE = 10

export default function ClientBookingsPage() {
  const t = useTranslations("Bookings")
  const locale = useLocale()

  const STATUS_OPTIONS: { value: "all" | BookingStatus; label: string }[] =
    React.useMemo(
      () => [
        { value: "all", label: t("allStatus") },
        {
          value: BookingStatus.PENDING,
          label: t(`statusLabels.${BookingStatus.PENDING}`),
        },
        {
          value: BookingStatus.CONFIRMED,
          label: t(`statusLabels.${BookingStatus.CONFIRMED}`),
        },
        {
          value: BookingStatus.IN_PROGRESS,
          label: t(`statusLabels.${BookingStatus.IN_PROGRESS}`),
        },
        {
          value: BookingStatus.PENDING_CLIENT_ACCEPTANCE,
          label: t(`statusLabels.${BookingStatus.PENDING_CLIENT_ACCEPTANCE}`),
        },
        {
          value: BookingStatus.COMPLETED,
          label: t(`statusLabels.${BookingStatus.COMPLETED}`),
        },
        {
          value: BookingStatus.CANCELLED,
          label: t(`statusLabels.${BookingStatus.CANCELLED}`),
        },
        {
          value: BookingStatus.REJECTED,
          label: t(`statusLabels.${BookingStatus.REJECTED}`),
        },
        {
          value: BookingStatus.DISPUTED,
          label: t(`statusLabels.${BookingStatus.DISPUTED}`),
        },
      ],
      [t]
    )
  const [page, setPage] = React.useState(1)
  const [statusFilter, setStatusFilter] = React.useState<"all" | BookingStatus>(
    "all"
  )
  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined)
  const [dateRangeInput, setDateRangeInput] = React.useState<
    DateRange | undefined
  >(undefined)

  const [cancelTarget, setCancelTarget] = React.useState<Booking | null>(null)
  const [disputeTarget, setDisputeTarget] = React.useState<Booking | null>(null)
  const [reviewTarget, setReviewTarget] = React.useState<Booking | null>(null)
  const [complaintLoadingId, setComplaintLoadingId] = React.useState<
    string | null
  >(null)

  const router = useRouter()
  const currentUserId = useAuthStore((state) => state.user?.id ?? null)

  const query = React.useMemo<BookingListQuery>(
    () => ({
      page,
      limit: PAGE_SIZE,
      role: "client",
      status: statusFilter === "all" ? undefined : statusFilter,
      start_date: startDate ? startDate.toISOString() : undefined,
      end_date: endDate ? endDate.toISOString() : undefined,
    }),
    [page, statusFilter, startDate, endDate]
  )

  const bookingsQuery = useMyBookings(query)
  const cancelMutation = useCancelBooking()
  const disputeMutation = useCreateDispute()
  const updateStatusMutation = useUpdateBookingStatus()
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
    setDateRangeInput(undefined)
    setPage(1)
  }

  const handleMobileStatusChange = (value: "all" | BookingStatus) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handleApplyMobileFilters = () => {
    setStartDate(dateRangeInput?.from)
    setEndDate(dateRangeInput?.to)
    setPage(1)
  }

  const advancedFilterCount = startDate || endDate ? 1 : 0

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

  const handleCompleteBooking = async (booking: Booking) => {
    await updateStatusMutation.mutateAsync({
      id: getBookingId(booking),
      payload: { status: BookingStatus.COMPLETED },
    })
  }

  const handleReviewSubmit = async (values: {
    rating: number
    rating_details: ReviewRatingDetails
    comment: string
  }) => {
    if (!reviewTarget) return
    if (!currentUserId) {
      toast.error(t("loginRequiredReview"))
      return
    }
    const workerId = getRefId(reviewTarget.worker_id)
    if (!workerId) {
      toast.error(t("workerNotFound"))
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
      toast.error(getErrorMessage(error, t("complaintGroupError")))
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
    const showCancel = !expired && canCancelBooking(booking.status)
    const showDispute = !expired && canComplainBooking(booking.status)
    const showComplete =
      !expired && booking.status === BookingStatus.PENDING_CLIENT_ACCEPTANCE
    const showReview = booking.status === BookingStatus.COMPLETED
    const showComplaintGroup = booking.status === BookingStatus.DISPUTED
    const complaintLoading = complaintLoadingId === bookingId
    const completing =
      updateStatusMutation.isPending &&
      updateStatusMutation.variables?.id === bookingId
    const hasActions =
      showComplaintGroup || showReview || showComplete || showDispute || showCancel

    if (!hasActions) {
      return (
        <div className="flex justify-end">
          <Select disabled value="none">
            <SelectTrigger className="h-9 w-full min-w-40 text-muted-foreground data-[size=default]:h-9 md:w-44">
              <SelectValue placeholder={t("noActions")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("noActions")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )
    }

    const handleActionChange = (value: string) => {
      switch (value) {
        case "complaint-group":
          void handleOpenComplaintGroup(booking)
          break
        case "review":
          setReviewTarget(booking)
          break
        case "complete":
          void handleCompleteBooking(booking)
          break
        case "dispute":
          setDisputeTarget(booking)
          break
        case "cancel":
          setCancelTarget(booking)
          break
      }
    }

    return (
      <div className="flex justify-end">
        <Select
          value=""
          onValueChange={handleActionChange}
          disabled={complaintLoading || completing}
        >
          <SelectTrigger
            aria-label={t("selectAction")}
            className="h-9 w-full min-w-40 cursor-pointer px-3 data-[size=default]:h-9 md:w-44"
          >
            {complaintLoading || completing ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : null}
            <SelectValue placeholder={t("selectAction")} />
          </SelectTrigger>
          <SelectContent align="end" className="min-w-52">
            {showComplaintGroup ? (
              <SelectItem
                value="complaint-group"
                className="cursor-pointer py-2 pr-8 pl-2.5"
              >
                <MessageSquare className="size-4" />
                {t("openComplaintGroup")}
              </SelectItem>
            ) : null}
            {showReview ? (
              <SelectItem
                value="review"
                className="cursor-pointer py-2 pr-8 pl-2.5"
              >
                <Star className="size-4" />
                {t("review")}
              </SelectItem>
            ) : null}
            {showComplete ? (
              <SelectItem
                value="complete"
                className="cursor-pointer py-2 pr-8 pl-2.5"
              >
                <CheckCircle2 className="size-4" />
                {t("confirmComplete")}
              </SelectItem>
            ) : null}
            {showDispute ? (
              <SelectItem
                value="dispute"
                className="cursor-pointer py-2 pr-8 pl-2.5"
              >
                <MessageSquareWarning className="size-4" />
                {t("complaint")}
              </SelectItem>
            ) : null}
            {showCancel ? (
              <SelectItem
                value="cancel"
                className="cursor-pointer py-2 pr-8 pl-2.5 text-destructive focus:text-destructive"
              >
                <XCircle className="size-4" />
                {t("cancel")}
              </SelectItem>
            ) : null}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/booking-process")}
            aria-label={t("guide")}
            title={t("guide")}
          >
            <Info className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => bookingsQuery.refetch()}
            disabled={bookingsQuery.isFetching}
            aria-label={t("refresh")}
            title={t("refresh")}
          >
            {bookingsQuery.isFetching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </Button>
        </div>
      </div>

      <Card className="mb-5 hidden md:block">
        <CardContent className="grid gap-4 p-5 md:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="filter-status">{t("status")}</Label>
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
            <Label>{t("fromDate")}</Label>
            <DatePicker
              value={startDate}
              onChange={(date) => {
                setStartDate(date)
                setDateRangeInput((prev) => ({ from: date, to: prev?.to }))
                setPage(1)
              }}
              toDate={endDate}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("toDate")}</Label>
            <DatePicker
              value={endDate}
              onChange={(date) => {
                setEndDate(date)
                setDateRangeInput((prev) => ({ from: prev?.from, to: date }))
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
              {t("reset")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 md:hidden">
        <ClientBookingsMobileFilters
          statusOptions={STATUS_OPTIONS}
          statusValue={statusFilter}
          onStatusChange={handleMobileStatusChange}
          dateRange={dateRangeInput}
          onDateRangeChange={setDateRangeInput}
          advancedFilterCount={advancedFilterCount}
          onApply={handleApplyMobileFilters}
          onReset={handleResetFilters}
        />
      </div>

      <Card className="rounded-none border-0 bg-transparent shadow-none md:rounded-xl md:border md:bg-card md:shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b-0 bg-transparent p-0 pb-3 md:border-b md:bg-muted/30 md:p-6">
          <CardTitle className="text-base">{t("listTitle")}</CardTitle>
          <Badge variant="outline">{total}</Badge>
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
                {t("loadError")}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bookingsQuery.refetch()}
              >
                {t("tryAgain")}
              </Button>
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-4 text-center">
              <CalendarCheck2 className="size-9 text-muted-foreground" />
              <p className="text-sm font-medium">{t("noBookings")}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 md:hidden">
                {bookings.map((booking) => {
                  const bookingId = getBookingId(booking)
                  return (
                    <BookingCard
                      key={bookingId}
                      booking={booking}
                      onCancel={setCancelTarget}
                      onDispute={setDisputeTarget}
                      onReview={setReviewTarget}
                      onComplete={handleCompleteBooking}
                      onOpenComplaintGroup={handleOpenComplaintGroup}
                      openingComplaintGroup={complaintLoadingId === bookingId}
                      completing={
                        updateStatusMutation.isPending &&
                        updateStatusMutation.variables?.id === bookingId
                      }
                    />
                  )
                })}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[1040px]">
                  <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">{t("service")}</th>
                      <th className="px-4 py-3 font-medium">{t("worker")}</th>
                      <th className="px-4 py-3 font-medium">{t("appointment")}</th>
                      <th className="px-4 py-3 font-medium">{t("status")}</th>
                      <th className="px-4 py-3 font-medium">{t("createdAt")}</th>
                      <th className="px-4 py-3 font-medium">
                        {t("workerNotes")}
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        {t("actions")}
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
                      const confirmDeadline = expired
                        ? null
                        : getConfirmationDeadline(
                            booking.schedule,
                            booking.status,
                            booking.created_at
                          )
                      const bookingId = getBookingId(booking)

                      return (
                        <tr
                          key={bookingId}
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
                            {getWorkerName(booking.worker_id)}
                          </td>
                          <td className="px-4 py-3">
                            <div>
                               {!booking.schedule.start_time ? "-" : new Date(booking.schedule.start_time).toLocaleString(locale === "vi" ? "vi-VN" : locale === "zh" ? "zh-CN" : "en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t("duration", { hours: booking.schedule.duration_hours })}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="inline-flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                                  bookingStatusBadgeClass[displayStatus]
                                )}
                              >
                                {t(`statusLabels.${displayStatus}`)}
                              </span>
                              {booking.status === BookingStatus.CANCELLED &&
                              booking.cancellation ? (
                                <HoverCard openDelay={100} closeDelay={100}>
                                  <HoverCardTrigger asChild>
                                    <button
                                      type="button"
                                      aria-label={t("viewCancelReason")}
                                      className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                                    >
                                      <Info className="size-4" />
                                    </button>
                                  </HoverCardTrigger>
                                  <HoverCardContent
                                    align="start"
                                    className="text-xs"
                                  >
                                    <div className="space-y-1.5">
                                      <div>
                                        <span className="text-muted-foreground">
                                          {t("cancelReasonPrefix", {
                                            reason: t(
                                              `cancellationReasons.${booking.cancellation.reason}`
                                            ),
                                          })}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">
                                          {t("cancelledByPrefix", {
                                            by: t(
                                              `cancelledBy.${booking.cancellation.cancelled_by}`
                                            ),
                                          })}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">
                                          {t("cancelledAtPrefix", {
                                            time: new Date(
                                              booking.cancellation.cancelled_at
                                            ).toLocaleString(
                                              locale === "vi"
                                                ? "vi-VN"
                                                : locale === "zh"
                                                ? "zh-CN"
                                                : "en-US",
                                              {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
                                              }
                                            ),
                                          })}
                                        </span>
                                      </div>
                                      {booking.cancellation.notes ? (
                                        <div>
                                          <div className="text-muted-foreground">
                                            {t("notes")}
                                          </div>
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
                            {confirmDeadline ? (
                              <BookingCountdown
                                deadline={confirmDeadline}
                                className="mt-1.5"
                              />
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(booking.created_at).toLocaleString(locale === "vi" ? "vi-VN" : locale === "zh" ? "zh-CN" : "en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                          </td>
                          <td className="max-w-[260px] px-4 py-3 text-sm text-muted-foreground">
                            {booking.worker_response ? (
                              <div className="line-clamp-3 whitespace-pre-wrap">
                                {booking.worker_response}
                              </div>
                            ) : (
                              "-"
                            )}
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
            {t("prev")}
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
            {t("next")}
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
