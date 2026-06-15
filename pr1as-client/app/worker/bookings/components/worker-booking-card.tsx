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
import { useLocale, useTranslations } from "next-intl"

import { BookingCountdown } from "@/components/booking/booking-countdown"
import { INTL_LOCALE_TAGS, type SupportedLocale } from "@/lib/locale"
import { cn } from "@/lib/utils"
import { BookingStatus, type Booking } from "@/types/booking"

import {
  bookingStatusBadgeClass,
  formatDateTime,
  getClientName,
  getConfirmationDeadline,
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
  const t = useTranslations("WorkerBookings")
  const tStatus = useTranslations("Bookings.statusLabels")
  const locale = useLocale() as SupportedLocale
  const localeTag = INTL_LOCALE_TAGS[locale] ?? INTL_LOCALE_TAGS.vi
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

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base leading-tight font-semibold">
            {getServiceLabel(booking, locale)}
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
          {tStatus(displayStatus)}
        </span>
      </div>

      {confirmDeadline ? (
        <div className="mt-2.5 px-5">
          <BookingCountdown deadline={confirmDeadline} />
        </div>
      ) : null}

      <div className="mt-3 space-y-3 px-5">
        <InfoRow icon={User2} label={t("customer")}>
          <span className="font-medium">
            {getClientName(booking.client_id)}
          </span>
        </InfoRow>

        <InfoRow icon={CalendarDays} label={t("appointment")}>
          <span className="font-medium">
            {formatDateTime(booking.schedule.start_time, localeTag)}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock3 className="size-3" />
            {t("duration", { hours: booking.schedule.duration_hours })}
          </span>
        </InfoRow>

        {booking.client_notes ? (
          <InfoRow icon={Quote} label={t("customerNotes")}>
            <span className="whitespace-pre-wrap text-muted-foreground">
              {booking.client_notes}
            </span>
          </InfoRow>
        ) : null}

        {booking.worker_response ? (
          <InfoRow icon={MessageSquare} label={t("yourResponse")}>
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
              {t("actions")}
              <ChevronRight className="size-4" />
            </>
          )}
        </button>
      ) : (
        <div className="mt-3.5 border-t py-3.5 text-center text-sm text-muted-foreground">
          {t("noActions")}
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
