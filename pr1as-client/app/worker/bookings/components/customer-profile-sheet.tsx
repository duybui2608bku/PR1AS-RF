"use client"

import * as React from "react"
import { BadgeCheck, Loader2, ShieldCheck, User2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"

import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useBookingClientProfile } from "@/lib/hooks/use-bookings"
import { INTL_LOCALE_TAGS, type SupportedLocale } from "@/lib/locale"
import { type Booking } from "@/types/booking"

import { getBookingId } from "../format"

type CustomerProfileSheetProps = {
  open: boolean
  booking: Booking | null
  onOpenChange: (open: boolean) => void
}

export function CustomerProfileSheet({
  open,
  booking,
  onOpenChange,
}: CustomerProfileSheetProps) {
  const t = useTranslations("WorkerBookings")
  const locale = useLocale() as SupportedLocale
  const localeTag = INTL_LOCALE_TAGS[locale] ?? INTL_LOCALE_TAGS.vi
  const bookingId = booking ? getBookingId(booking) : null
  const { data, isLoading, isError } = useBookingClientProfile(bookingId, open)

  const cancelRate =
    data && data.total_count > 0
      ? Math.round((data.client_cancelled_count / data.total_count) * 100)
      : 0
  const memberSince = data
    ? new Intl.DateTimeFormat(localeTag, {
        year: "numeric",
        month: "long",
      }).format(new Date(data.member_since))
    : ""

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent className="px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
        <BottomSheetTitle>{t("customerProfileTitle")}</BottomSheetTitle>
        <BottomSheetDescription className="sr-only">
          {t("customerProfileTitle")}
        </BottomSheetDescription>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError || !data ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("profileLoadError")}
          </p>
        ) : (
          <div className="space-y-5 py-2">
            <div className="flex items-center gap-4">
              <Avatar size="lg" className="size-16 shrink-0">
                {data.avatar ? (
                  <AvatarImage
                    src={data.avatar}
                    alt={data.full_name ?? ""}
                  />
                ) : null}
                <AvatarFallback>
                  <User2 className="size-7 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-lg font-semibold">
                  <span className="truncate">{data.full_name ?? "—"}</span>
                  {data.is_verified ? (
                    <BadgeCheck className="size-5 shrink-0 text-primary" />
                  ) : null}
                </p>
                {memberSince ? (
                  <p className="text-sm text-muted-foreground">
                    {t("memberSince", { date: memberSince })}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {data.is_verified ? (
                <Badge variant="secondary" className="gap-1 rounded-full">
                  <ShieldCheck className="size-3.5" />
                  {t("verifiedBadge")}
                </Badge>
              ) : null}
              <Badge variant="secondary" className="rounded-full">
                {t("reputation")}: {data.reputation_score}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border bg-card p-4">
                <p className="text-2xl font-semibold">{data.completed_count}</p>
                <p className="text-xs text-muted-foreground">
                  {t("completedBookings", { count: data.completed_count })}
                </p>
              </div>
              <div className="rounded-2xl border bg-card p-4">
                <p className="text-2xl font-semibold">{cancelRate}%</p>
                <p className="text-xs text-muted-foreground">
                  {t("cancelRate", { rate: cancelRate })}
                </p>
              </div>
            </div>
          </div>
        )}
      </BottomSheetContent>
    </BottomSheet>
  )
}

CustomerProfileSheet.displayName = "CustomerProfileSheet"
