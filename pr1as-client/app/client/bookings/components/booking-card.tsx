"use client"

import * as React from "react"
import {
  CalendarDays,
  Clock,
  Info,
  Loader2,
  MessageSquare,
  MessageSquareWarning,
  Star,
  User2,
  XCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"
import { BookingStatus, type Booking } from "@/types/booking"

import {
  bookingStatusBadgeClass,
  bookingStatusLabel,
  canCancelBooking,
  canComplainBooking,
  cancellationReasonLabel,
  cancelledByLabel,
  formatDateTime,
  getServiceLabel,
  getWorkerName,
  isBookingExpired,
} from "../format"

type BookingCardProps = {
  booking: Booking
  onCancel: (booking: Booking) => void
  onDispute: (booking: Booking) => void
  onReview: (booking: Booking) => void
  onOpenComplaintGroup: (booking: Booking) => void
  openingComplaintGroup?: boolean
}

export function BookingCard({
  booking,
  onCancel,
  onDispute,
  onReview,
  onOpenComplaintGroup,
  openingComplaintGroup,
}: BookingCardProps) {
  const expired = isBookingExpired(booking.schedule, booking.status)
  const displayStatus = expired ? BookingStatus.EXPIRED : booking.status
  const showCancel = !expired && canCancelBooking(booking.status)
  const showDispute = !expired && canComplainBooking(booking.status)
  const showReview = booking.status === BookingStatus.COMPLETED
  const showComplaintGroup = booking.status === BookingStatus.DISPUTED

  return (
    <div className="border-b p-4 last:border-b-0">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold leading-tight">
            {getServiceLabel(booking)}
          </div>
          <div className="text-xs uppercase text-muted-foreground">
            {booking.service_code}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
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
              <HoverCardContent align="end" className="text-xs">
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
      </div>

      <dl className="grid grid-cols-1 gap-2 text-sm">
        <div className="flex items-start gap-2">
          <User2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <dt className="text-xs text-muted-foreground">Worker</dt>
            <dd className="truncate font-medium">
              {getWorkerName(booking.worker_id)}
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <dt className="text-xs text-muted-foreground">Lịch hẹn</dt>
            <dd className="font-medium">
              {formatDateTime(booking.schedule.start_time)}
            </dd>
            <dd className="text-xs text-muted-foreground">
              Thời lượng: {booking.schedule.duration_hours} giờ
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <dt className="text-xs text-muted-foreground">Ngày tạo</dt>
            <dd className="text-muted-foreground">
              {formatDateTime(booking.created_at)}
            </dd>
          </div>
        </div>
      </dl>

      {showCancel || showDispute || showReview || showComplaintGroup ? (
        <div className="mt-3 flex flex-wrap justify-end gap-2 border-t pt-3">
          {showComplaintGroup ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenComplaintGroup(booking)}
              disabled={openingComplaintGroup}
            >
              {openingComplaintGroup ? (
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
              onClick={() => onReview(booking)}
            >
              <Star className="size-4" />
              Đánh giá
            </Button>
          ) : null}
          {showDispute ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDispute(booking)}
            >
              <MessageSquareWarning className="size-4" />
              Khiếu nại
            </Button>
          ) : null}
          {showCancel ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onCancel(booking)}
            >
              <XCircle className="size-4" />
              Hủy
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

BookingCard.displayName = "BookingCard"
