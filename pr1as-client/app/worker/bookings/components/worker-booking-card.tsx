"use client"

import * as React from "react"
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Loader2,
  MessageSquare,
  Quote,
  User2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { BookingStatus, type Booking } from "@/types/booking"

import {
  bookingStatusBadgeClass,
  bookingStatusLabel,
  formatDateTime,
  getClientName,
  getServiceLabel,
  isBookingExpired,
} from "../format"

type WorkerBookingCardProps = {
  booking: Booking
  hasActions: boolean
  actionLoading?: boolean
  onOpenActions: (booking: Booking) => void
}

export function WorkerBookingCard({
  booking,
  hasActions,
  actionLoading,
  onOpenActions,
}: WorkerBookingCardProps) {
  const expired = isBookingExpired(
    booking.schedule,
    booking.status,
    booking.created_at
  )
  const displayStatus = expired ? BookingStatus.EXPIRED : booking.status

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base leading-tight font-semibold">
            {getServiceLabel(booking)}
          </p>
          <p className="mt-0.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {booking.service_code}
          </p>
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

      <div className="mt-3 space-y-3 px-4">
        <InfoRow icon={User2} label="Khách hàng">
          <span className="font-medium">
            {getClientName(booking.client_id)}
          </span>
        </InfoRow>

        <InfoRow icon={CalendarDays} label="Lịch hẹn">
          <span className="font-medium">
            {formatDateTime(booking.schedule.start_time)}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock3 className="size-3" />
            Thời lượng {booking.schedule.duration_hours} giờ
          </span>
        </InfoRow>

        {booking.client_notes ? (
          <InfoRow icon={Quote} label="Ghi chú khách hàng">
            <span className="whitespace-pre-wrap text-muted-foreground">
              {booking.client_notes}
            </span>
          </InfoRow>
        ) : null}

        {booking.worker_response ? (
          <InfoRow icon={MessageSquare} label="Phản hồi của bạn">
            <span className="whitespace-pre-wrap text-muted-foreground">
              {booking.worker_response}
            </span>
          </InfoRow>
        ) : null}
      </div>

      {hasActions ? (
        <button
          type="button"
          onClick={() => onOpenActions(booking)}
          disabled={actionLoading}
          className="mt-3.5 flex w-full items-center justify-center gap-1.5 border-t py-3.5 text-sm font-semibold text-primary transition-colors hover:bg-accent active:bg-accent/70 disabled:opacity-60"
        >
          {actionLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Hành động
              <ChevronRight className="size-4" />
            </>
          )}
        </button>
      ) : (
        <div className="mt-3.5 border-t py-3.5 text-center text-sm text-muted-foreground">
          Không có hành động
        </div>
      )}
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="size-3.5 text-muted-foreground" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        {children}
      </div>
    </div>
  )
}

WorkerBookingCard.displayName = "WorkerBookingCard"
