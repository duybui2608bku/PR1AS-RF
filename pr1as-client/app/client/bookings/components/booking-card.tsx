"use client"

import * as React from "react"
import Link from "next/link"
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  MessageCircle,
  MessageSquare,
  MessageSquareWarning,
  Star,
  User2,
  XCircle,
} from "lucide-react"

import { BookingCountdown } from "@/components/booking/booking-countdown"
import { Button } from "@/components/ui/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { useTranslations, useLocale } from "next-intl"
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
  getConfirmationDeadline,
  getRefId,
  getServiceLabel,
  getWorkerName,
  isBookingExpired,
} from "../format"

type BookingCardProps = {
  booking: Booking
  onCancel: (booking: Booking) => void
  onDispute: (booking: Booking) => void
  onReview: (booking: Booking) => void
  onComplete: (booking: Booking) => void
  onOpenComplaintGroup: (booking: Booking) => void
  openingComplaintGroup?: boolean
  completing?: boolean
}

export function BookingCard({
  booking,
  onCancel,
  onDispute,
  onReview,
  onComplete,
  onOpenComplaintGroup,
  openingComplaintGroup,
  completing,
}: BookingCardProps) {
  const t = useTranslations("Bookings")
  const locale = useLocale()

  const expired = isBookingExpired(
    booking.schedule,
    booking.status,
    booking.created_at
  )
  const displayStatus = expired ? BookingStatus.EXPIRED : booking.status
  const confirmDeadline = expired
    ? null
    : getConfirmationDeadline(
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
  const workerId = getRefId(booking.worker_id)

  const formatLdt =(val?: string | null) => {
    if (!val) return "-"
    return new Date(val).toLocaleString(
      locale === "vi"
        ? "vi-VN"
        : locale === "zh"
          ? "zh-CN"
          : locale === "ko"
            ? "ko-KR"
            : "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    )
  }

  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold leading-tight">
            {getServiceLabel(booking, locale)}
          </div>
          <div className="text-xs uppercase text-muted-foreground">
            {booking.service_code}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={cn(
              "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
              bookingStatusBadgeClass[displayStatus]
            )}
          >
            {t(`statusLabels.${displayStatus}`)}
          </span>
          {booking.status === BookingStatus.CANCELLED && booking.cancellation ? (
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
              <HoverCardContent align="end" className="text-xs">
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
                        by: t(`cancelledBy.${booking.cancellation.cancelled_by}`),
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {t("cancelledAtPrefix", {
                        time: formatLdt(booking.cancellation.cancelled_at),
                      })}
                    </span>
                  </div>
                  {booking.cancellation.notes ? (
                    <div>
                      <div className="text-muted-foreground">{t("notes")}</div>
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

      {confirmDeadline ? (
        <BookingCountdown deadline={confirmDeadline} className="mb-3" />
      ) : null}

      <dl className="grid grid-cols-1 gap-2 text-sm">
        <div className="flex items-start gap-2">
          <User2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <dt className="text-xs text-muted-foreground">{t("worker")}</dt>
            <dd className="truncate font-medium">
              {getWorkerName(booking.worker_id)}
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <dt className="text-xs text-muted-foreground">{t("appointment")}</dt>
            <dd className="font-medium">
              {formatLdt(booking.schedule.start_time)}
            </dd>
            <dd className="text-xs text-muted-foreground">
              {t("duration", { hours: booking.schedule.duration_hours })}
            </dd>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <dt className="text-xs text-muted-foreground">{t("createdAt")}</dt>
            <dd className="text-muted-foreground">
              {formatLdt(booking.created_at)}
            </dd>
          </div>
        </div>
        {booking.worker_response ? (
          <div className="flex items-start gap-2">
            <MessageSquare className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <dt className="text-xs text-muted-foreground">
                {t("workerNotes")}
              </dt>
              <dd className="whitespace-pre-wrap text-muted-foreground">
                {booking.worker_response}
              </dd>
            </div>
          </div>
        ) : null}
      </dl>

      {showCancel ||
      showDispute ||
      showComplete ||
      showReview ||
      showComplaintGroup ||
      workerId ? (
        <div className="mt-3 flex flex-wrap justify-end gap-2 border-t pt-3">
          {workerId ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/chat?receiver_id=${workerId}`}>
                <MessageCircle className="size-4" />
                {t("sendMessage")}
              </Link>
            </Button>
          ) : null}
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
              {t("openComplaintGroup")}
            </Button>
          ) : null}
          {showReview ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReview(booking)}
            >
              <Star className="size-4" />
              {t("review")}
            </Button>
          ) : null}
          {showComplete ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onComplete(booking)}
              disabled={completing}
            >
              {completing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {t("confirmComplete")}
            </Button>
          ) : null}
          {showDispute ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDispute(booking)}
            >
              <MessageSquareWarning className="size-4" />
              {t("complaint")}
            </Button>
          ) : null}
          {showCancel ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onCancel(booking)}
            >
              <XCircle className="size-4" />
              {t("cancel")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

BookingCard.displayName = "BookingCard"
