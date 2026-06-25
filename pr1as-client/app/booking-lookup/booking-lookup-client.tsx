"use client"

import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  CalendarClock,
  CheckCircle2,
  Copy,
  Loader2,
  Mail,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  User2,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { bookingService } from "@/services/booking.service"
import { INTL_LOCALE_TAGS, type SupportedLocale, pickLocalized } from "@/lib/locale"

const STATUS_LABELS: Record<string, Record<SupportedLocale, string>> = {
  pending: {
    vi: "Chờ xác nhận",
    en: "Pending",
    ko: "대기",
    zh: "待确认",
  },
  confirmed: {
    vi: "Đã xác nhận",
    en: "Confirmed",
    ko: "확인됨",
    zh: "已确认",
  },
  in_progress: {
    vi: "Đang thực hiện",
    en: "In progress",
    ko: "진행 중",
    zh: "进行中",
  },
  pending_client_acceptance: {
    vi: "Đang chờ bạn xác nhận",
    en: "Awaiting your acceptance",
    ko: "고객 확인 대기",
    zh: "等待客户确认",
  },
  completed: {
    vi: "Đã hoàn thành",
    en: "Completed",
    ko: "완료",
    zh: "已完成",
  },
  cancelled: {
    vi: "Đã huỷ",
    en: "Cancelled",
    ko: "취소됨",
    zh: "已取消",
  },
  rejected: {
    vi: "Đã từ chối",
    en: "Rejected",
    ko: "거절됨",
    zh: "已拒绝",
  },
  disputed: {
    vi: "Đang tranh chấp",
    en: "Disputed",
    ko: "분쟁 중",
    zh: "有争议",
  },
  expired: {
    vi: "Đã hết hạn",
    en: "Expired",
    ko: "만료됨",
    zh: "已过期",
  },
}

function getStatusLabel(status: string, locale: SupportedLocale) {
  const key = status.toLowerCase()
  return STATUS_LABELS[key]?.[locale] ?? STATUS_LABELS[key]?.en ?? status
}

function formatDateTime(value: string, localeTag: string) {
  return new Date(value).toLocaleString(localeTag, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function BookingLookupClient() {
  const t = useTranslations("BookingLookup")
  const locale = useLocale() as SupportedLocale
  const localeTag = INTL_LOCALE_TAGS[locale] ?? INTL_LOCALE_TAGS.en
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const [code, setCode] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [submitted, setSubmitted] = React.useState(false)

  React.useEffect(() => {
    const nextCode = searchParams.get("code") ?? searchParams.get("public_ref") ?? ""
    const nextEmail = searchParams.get("email") ?? ""
    if (nextCode) setCode(nextCode)
    if (nextEmail) setEmail(nextEmail)
    if (nextCode && nextEmail) setSubmitted(true)
  }, [searchParams])

  const lookupQuery = useQuery({
    queryKey: ["booking-lookup", code.trim().toUpperCase(), email.trim().toLowerCase()],
    queryFn: () =>
      bookingService.lookupGuestBooking({
        public_ref: code.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
      }),
    enabled:
      submitted &&
      Boolean(code.trim()) &&
      Boolean(email.trim()),
    retry: false,
  })

  const booking = lookupQuery.data ?? null

  const lookupLink = React.useMemo(() => {
    if (!code.trim() || !email.trim()) return ""
    const params = new URLSearchParams()
    params.set("code", code.trim().toUpperCase())
    params.set("email", email.trim().toLowerCase())
    const origin = typeof window === "undefined" ? "" : window.location.origin
    return origin ? `${origin}/booking-lookup?${params.toString()}` : ""
  }, [code, email])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!code.trim() || !email.trim()) {
      toast.error(t("invalid"))
      return
    }
    setSubmitted(true)
  }

  const handleCopy = async () => {
    if (!lookupLink) return
    await navigator.clipboard.writeText(lookupLink)
    toast.success(t("copied"))
  }

  const serviceName =
    booking?.service_id && typeof booking.service_id === "object"
      ? pickLocalized(
          typeof booking.service_id.name === "string"
            ? { en: booking.service_id.name, vi: booking.service_id.name }
            : booking.service_id.name,
          locale
        ) || booking.service_code
      : booking?.service_code ?? "-"

  const workerName =
    booking?.worker_id && typeof booking.worker_id === "object"
      ? booking.worker_id.full_name || booking.worker_id.email || "-"
      : "-"

  const guestName = booking?.guest_contact?.name || t("guest")
  const guestEmail = booking?.guest_contact?.email || email || "-"
  const statusLabel = booking ? getStatusLabel(booking.status, locale) : ""
  const scheduleLabel = booking
    ? `${formatDateTime(booking.schedule.start_time, localeTag)} - ${formatDateTime(booking.schedule.end_time, localeTag)}`
    : "-"

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
      <Card className="border-border/70 bg-card/95 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.35)]">
        <CardHeader className="space-y-2">
          <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
            <ShieldCheck className="mr-1.5 size-3.5" />
            {t("title")}
          </Badge>
          <CardTitle className="text-2xl">{t("subtitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("prefilled")}</p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="booking-lookup-code">{t("codeLabel")}</Label>
              <Input
                id="booking-lookup-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="QB-1234ABCD"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="booking-lookup-email">{t("emailLabel")}</Label>
              <Input
                id="booking-lookup-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={lookupQuery.isFetching}>
                {lookupQuery.isFetching ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                {t("submit")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCode("")
                  setEmail("")
                  setSubmitted(false)
                  queryClient.removeQueries({ queryKey: ["booking-lookup"] })
                }}
              >
                <RefreshCw className="size-4" />
                {t("reset")}
              </Button>
              {lookupLink ? (
                <Button type="button" variant="ghost" onClick={handleCopy}>
                  <Copy className="size-4" />
                  {t("copy")}
                </Button>
              ) : null}
            </div>
          </form>
          <div className="mt-5 rounded-2xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            {lookupQuery.isFetching
              ? t("loading")
              : lookupQuery.isError
                ? t("notFound")
                : booking
                  ? t("tracking")
                  : t("empty")}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.35)]">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <CardTitle className="text-2xl">
                {booking ? t("status") : t("tracking")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {booking ? booking.public_ref || "-" : t("loading")}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {booking ? (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full">{statusLabel}</Badge>
                <Badge variant="secondary" className="rounded-full">
                  {booking.is_guest ? t("guest") : t("worker")}
                </Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <InfoRow icon={User2} label={t("guest")} value={guestName} />
                <InfoRow icon={Mail} label={t("emailLabel")} value={guestEmail} />
                <InfoRow icon={ShieldCheck} label={t("worker")} value={workerName} />
                <InfoRow
                  icon={MapPin}
                  label={t("service")}
                  value={serviceName}
                />
                <InfoRow
                  icon={CalendarClock}
                  label={t("schedule")}
                  value={scheduleLabel}
                />
                <InfoRow
                  icon={CalendarClock}
                  label={t("createdAt")}
                  value={formatDateTime(booking.created_at, localeTag)}
                />
              </div>

              <div className="rounded-3xl border bg-muted/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("codeLabel")}
                </p>
                <p className="mt-1 text-lg font-semibold">{booking.public_ref}</p>
              </div>
            </div>
          ) : (
            <div className="flex min-h-72 items-center justify-center rounded-3xl border border-dashed bg-muted/20 text-sm text-muted-foreground">
              {lookupQuery.isError ? t("notFound") : t("empty")}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border bg-background/80 px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" />
        <span>{label}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}
