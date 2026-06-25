"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User2,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import Link from "next/link"
import { toast } from "sonner"

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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/lib/hooks/use-currency"
import { INTL_LOCALE_TAGS, type SupportedLocale, pickLocalized } from "@/lib/locale"
import { workerService } from "@/services/worker.service"
import { useCreateGuestBooking } from "@/lib/hooks/use-bookings"
import type {
  Booking,
  BookingGuestContact,
  BookingPricing,
  CreateGuestBookingPayload,
} from "@/types/booking"
import type { WorkerPricingUnit } from "@/types"
const MIN_ADVANCE_HOURS = 2
const BOOKING_RANGE_DAYS = 30

const HOUR_OPTIONS = Array.from({ length: 15 }, (_, idx) => {
  const hour = 8 + idx
  return {
    value: `${String(hour).padStart(2, "0")}:00`,
    label: `${String(hour).padStart(2, "0")}:00`,
  }
})

const HOURS_PER_UNIT: Record<WorkerPricingUnit, number> = {
  HOURLY: 1,
  DAILY: 24,
  MONTHLY: 24 * 30,
}

const toIsoDate = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const startOfDay = (date: Date) => {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

const endOfRange = (date: Date) => {
  const value = new Date(date)
  value.setDate(value.getDate() + BOOKING_RANGE_DAYS)
  return value
}

const formatDateLabel = (date: Date, localeTag: string) =>
  date.toLocaleDateString(localeTag, {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

const getPricingUnitLabel = (
  unit: WorkerPricingUnit,
  tProfile: ReturnType<typeof useTranslations>
) => {
  switch (unit) {
    case "HOURLY":
      return tProfile("enums.unitHourly")
    case "DAILY":
      return tProfile("enums.unitDaily")
    case "MONTHLY":
      return tProfile("enums.unitMonthly")
    default:
      return unit
  }
}

const computeBookedDays = (
  schedule: Array<{ start_time: string; end_time: string }>
): Date[] => {
  const map = new Map<string, Date>()
  for (const item of schedule) {
    const start = startOfDay(new Date(item.start_time))
    const end = new Date(item.end_time)
    const cursor = new Date(start)
    while (cursor <= end) {
      const key = toIsoDate(cursor)
      if (!map.has(key)) map.set(key, new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
  }
  return [...map.values()]
}

type WizardStep = 0 | 1 | 2 | 3

type QuickBookingState = {
  name: string
  email: string
  phone: string
  notes: string
  serviceCode: string
  workerId: string
  unit: WorkerPricingUnit | ""
  quantity: string
  date?: Date
  time: string
}

const initialState: QuickBookingState = {
  name: "",
  email: "",
  phone: "",
  notes: "",
  serviceCode: "",
  workerId: "",
  unit: "",
  quantity: "1",
  date: undefined,
  time: "09:00",
}

export function QuickBookingWizard() {
  const t = useTranslations("QuickBooking")
  const tCommon = useTranslations("Common")
  const tProfile = useTranslations("WorkerProfile")
  const locale = useLocale() as SupportedLocale
  const localeTag = INTL_LOCALE_TAGS[locale] ?? INTL_LOCALE_TAGS.vi
  const { format } = useCurrency()
  const createBooking = useCreateGuestBooking()

  const [step, setStep] = React.useState<WizardStep>(0)
  const [state, setState] = React.useState<QuickBookingState>(initialState)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [submittedBooking, setSubmittedBooking] = React.useState<Booking | null>(null)

  const servicesQuery = useQuery({
    queryKey: ["quick-booking", "workers-grouped-by-service"],
    queryFn: () => workerService.getWorkersGroupedByService(),
    staleTime: 5 * 60 * 1000,
  })

  const selectedService = React.useMemo(
    () =>
      servicesQuery.data?.find(
        (item) => item.service.code === state.serviceCode
      ) ?? null,
    [servicesQuery.data, state.serviceCode]
  )

  const visibleWorkers = React.useMemo(() => {
    const workers = selectedService?.workers ?? []
    const term = searchTerm.trim().toLowerCase()
    if (!term) return workers
    return workers.filter((worker) => {
      const name = worker.full_name?.toLowerCase() ?? ""
      const title = worker.worker_profile?.title?.toLowerCase() ?? ""
      return name.includes(term) || title.includes(term)
    })
  }, [searchTerm, selectedService])

  const selectedWorker = React.useMemo(
    () =>
      selectedService?.workers.find((worker) => worker.id === state.workerId) ??
      null,
    [selectedService, state.workerId]
  )

  const workerDetailQuery = useQuery({
    queryKey: ["quick-booking", "worker-detail", state.workerId],
    queryFn: () => workerService.getWorkerById(state.workerId),
    enabled: Boolean(state.workerId),
    staleTime: 60_000,
  })

  const workerDetail = workerDetailQuery.data ?? null

  const workerScheduleQuery = useQuery({
    queryKey: ["quick-booking", "worker-schedule", state.workerId],
    queryFn: () =>
      workerService.getWorkerSchedule(state.workerId, {
        start_date: toIsoDate(startOfDay(new Date())),
        end_date: toIsoDate(endOfRange(new Date())),
      }),
    enabled: Boolean(state.workerId),
    staleTime: 30_000,
  })

  const workerServiceItem = React.useMemo(() => {
    if (!workerDetail || !state.serviceCode) return null
    return (
      workerDetail.services?.find(
        (service) => service.service_code === state.serviceCode
      ) ?? null
    )
  }, [state.serviceCode, workerDetail])

  const pricingOptions = workerServiceItem?.pricing ?? []

  const selectedPricing = React.useMemo(() => {
    if (!pricingOptions.length) return null
    return (
      pricingOptions.find((price) => price.unit === state.unit) ??
      pricingOptions[0] ??
      null
    )
  }, [pricingOptions, state.unit])

  React.useEffect(() => {
    if (!selectedService) {
      if (state.serviceCode || state.workerId || state.unit !== "") {
        setState((current) => ({
          ...current,
          serviceCode: "",
          workerId: "",
          unit: "",
        }))
      }
      return
    }

    if (!selectedWorker && state.workerId) {
      setState((current) => ({
        ...current,
        workerId: "",
        unit: "",
      }))
    }
  }, [selectedService, selectedWorker, state.serviceCode, state.unit, state.workerId])

  React.useEffect(() => {
    if (!pricingOptions.length) return
    if (state.unit && pricingOptions.some((item) => item.unit === state.unit)) {
      return
    }
    setState((current) => ({
      ...current,
      unit: pricingOptions[0]?.unit ?? "",
    }))
  }, [pricingOptions, state.unit])

  const quantity = React.useMemo(() => {
    const parsed = Number.parseInt(state.quantity, 10)
    if (!Number.isFinite(parsed) || parsed < 1) return 1
    return Math.min(parsed, 1000)
  }, [state.quantity])

  const startDateTime = React.useMemo(() => {
    if (!state.date) return null
    const [hours, minutes] = state.time.split(":").map((value) => Number.parseInt(value, 10))
    const value = new Date(state.date)
    value.setHours(hours, minutes, 0, 0)
    return value
  }, [state.date, state.time])

  const endDateTime = React.useMemo(() => {
    if (!startDateTime || !state.unit) return null
    const hours = HOURS_PER_UNIT[state.unit] * quantity
    return new Date(startDateTime.getTime() + hours * 60 * 60 * 1000)
  }, [quantity, startDateTime, state.unit])

  const bookedDays = React.useMemo(() => {
    const items = [
      ...(workerScheduleQuery.data?.bookings ?? []),
      ...(workerScheduleQuery.data?.blackouts ?? []),
    ]
    return computeBookedDays(items)
  }, [workerScheduleQuery.data])

  const unitPriceVnd = selectedPricing
    ? selectedPricing.price_vnd ?? selectedPricing.price
    : null
  const totalPrice = unitPriceVnd ? unitPriceVnd * quantity : null

  const serviceName = selectedService
    ? pickLocalized(selectedService.service.name, locale) ??
      selectedService.service.code
    : ""
  const workerName = selectedWorker?.full_name ?? "-"
  const workerTitle = selectedWorker?.worker_profile?.title ?? "-"
  const workerLocation =
    selectedWorker?.worker_profile?.work_locations?.[0]?.label_snapshot ?? "-"

  const minAdvanceError = React.useMemo(() => {
    if (!startDateTime) return null
    const minStart = new Date(Date.now() + MIN_ADVANCE_HOURS * 60 * 60 * 1000)
    if (startDateTime < minStart) {
      return t("validationMinAdvance", { hours: MIN_ADVANCE_HOURS })
    }
    return null
  }, [startDateTime, t])

  const selectionError = React.useMemo(() => {
    if (!selectedService) return t("validationService")
    if (!selectedWorker) return t("validationWorker")
    if (!state.date) return t("validationDate")
    if (!state.time) return t("validationTime")
    if (!state.unit) return t("validationUnit")
    if (!pricingOptions.length) return t("validationPriceMissing")
    if (quantity < 1) return t("validationQuantity")
    if (bookedDays.some((day) => day.toDateString() === state.date?.toDateString())) {
      return t("validationSchedule")
    }
    return minAdvanceError
  }, [
    bookedDays,
    minAdvanceError,
    pricingOptions.length,
    quantity,
    selectedService,
    selectedWorker,
    state.date,
    state.time,
    state.unit,
    t,
  ])

  const setField = <K extends keyof QuickBookingState>(
    key: K,
    value: QuickBookingState[K]
  ) => {
    setState((current) => ({ ...current, [key]: value }))
  }

  const resetWizard = () => {
    setState(initialState)
    setSearchTerm("")
    setSubmittedBooking(null)
    setStep(0)
  }

  const stepItems = [
    { label: t("stepInfo") },
    { label: t("stepService") },
    { label: t("stepReview") },
    { label: t("stepSend") },
  ]

  const canContinueFromInfo =
    state.name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim())

  const handleInfoNext = () => {
    if (!state.name.trim()) {
      toast.error(t("validationName"))
      return
    }
    if (!state.email.trim()) {
      toast.error(t("validationEmail"))
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim())) {
      toast.error(t("validationEmailInvalid"))
      return
    }
    setStep(1)
  }

  const handleServiceNext = () => {
    if (!selectedService) {
      toast.error(t("validationService"))
      return
    }
    if (!selectedWorker) {
      toast.error(t("validationWorker"))
      return
    }
    if (selectionError) {
      toast.error(selectionError)
      return
    }
    setStep(2)
  }

  const handleSubmit = async () => {
    if (selectionError || !selectedService || !selectedWorker || !startDateTime || !endDateTime || !selectedPricing) {
      if (selectionError) toast.error(selectionError)
      return
    }

    const guestContact: BookingGuestContact = {
      name: state.name.trim(),
      email: state.email.trim().toLowerCase(),
      phone: state.phone.trim() || undefined,
    }

    const payload: CreateGuestBookingPayload = {
      guest_contact: guestContact,
      guest_locale: locale,
      worker_id: selectedWorker.id,
      worker_service_id: workerServiceItem?._id ?? "",
      service_id: workerServiceItem?.service_id ?? "",
      service_code: selectedService.service.code,
      schedule: {
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
      },
      pricing: {
        unit: selectedPricing.unit,
        quantity,
      } satisfies BookingPricing,
      client_notes: state.notes.trim() || undefined,
    }

    if (!payload.worker_service_id || !payload.service_id) {
      toast.error(t("validationPriceMissing"))
      return
    }

    try {
      const booking = await createBooking.mutateAsync(payload)
      setSubmittedBooking(booking ?? null)
      setStep(3)
    } catch {
      // Toast handled by mutation hook.
    }
  }

  const copyTrackingCode = async () => {
    const code = submittedBooking?.public_ref
    if (!code) return
    await navigator.clipboard.writeText(code)
    toast.success(code)
  }

  const lookupLink = React.useMemo(() => {
    if (!submittedBooking?.public_ref || !state.email.trim()) return null
    const params = new URLSearchParams()
    params.set("code", submittedBooking.public_ref)
    params.set("email", state.email.trim().toLowerCase())
    return `/booking-lookup?${params.toString()}`
  }, [state.email, submittedBooking?.public_ref])

  const lookupButtonLabel =
    locale === "vi"
      ? "Mở trang tra cứu booking"
      : locale === "ko"
        ? "예약 조회 열기"
        : locale === "zh"
          ? "打开预约查询"
          : "Open booking lookup"

  return (
    <div className="relative overflow-hidden rounded-[2rem] border bg-background shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(15,118,110,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.75),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(15,118,110,0.12),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.55),rgba(2,6,23,0))]" />
      <div className="relative grid gap-6 p-5 md:p-7 xl:grid-cols-[1.2fr_0.8fr] xl:gap-8 xl:p-9">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              <Sparkles className="mr-1.5 size-3.5" />
              {t("title")}
            </Badge>
            <span className="text-sm text-muted-foreground">{t("subtitle")}</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            {stepItems.map((item, index) => {
              const active = index === step
              const done = index < step
              return (
                <div
                  key={item.label}
                  className={cn(
                    "rounded-2xl border px-4 py-3 transition-all",
                    active
                      ? "border-primary/30 bg-primary/5 shadow-sm"
                      : done
                        ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                        : "border-border bg-background/70"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full text-xs font-semibold",
                        active
                          ? "bg-primary text-primary-foreground"
                          : done
                            ? "bg-emerald-600 text-white"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold">{item.label}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {step === 0 ? (
            <Card className="border-border/70 bg-card/95">
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <User2 className="size-5" />
                  {t("infoTitle")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{t("infoDesc")}</p>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quick-name">{t("name")}</Label>
                  <Input
                    id="quick-name"
                    value={state.name}
                    onChange={(event) => setField("name", event.target.value)}
                    placeholder={t("name")}
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="quick-email">{t("email")}</Label>
                    <Input
                      id="quick-email"
                      type="email"
                      value={state.email}
                      onChange={(event) => setField("email", event.target.value)}
                      placeholder="name@example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="quick-phone">{t("phone")}</Label>
                    <Input
                      id="quick-phone"
                      value={state.phone}
                      onChange={(event) => setField("phone", event.target.value)}
                      placeholder="+84..."
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="quick-notes">{t("notes")}</Label>
                  <Textarea
                    id="quick-notes"
                    value={state.notes}
                    onChange={(event) => setField("notes", event.target.value)}
                    rows={4}
                    maxLength={1000}
                  />
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <Card className="border-border/70 bg-card/95">
                <CardHeader className="space-y-2">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Sparkles className="size-5" />
                    {t("serviceTitle")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{t("serviceDesc")}</p>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                    <div className="grid gap-2">
                      <Label htmlFor="quick-worker-search">{t("searchWorker")}</Label>
                      <Input
                        id="quick-worker-search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder={t("searchWorker")}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full md:w-auto"
                        onClick={() => servicesQuery.refetch()}
                        disabled={servicesQuery.isFetching}
                      >
                        <RefreshCw
                          className={cn(
                            "size-4",
                            servicesQuery.isFetching && "animate-spin"
                          )}
                        />
                        {tCommon("refresh")}
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-3">
                      <p className="text-sm font-semibold">{t("selectService")}</p>
                      {servicesQuery.isLoading ? (
                        <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed bg-muted/20">
                          <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : servicesQuery.isError ? (
                        <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                          {t("validationService")}
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {servicesQuery.data?.map((service) => {
                            const active = service.service.code === state.serviceCode
                            const serviceLabel =
                              pickLocalized(service.service.name, locale) ??
                              service.service.code
                            return (
                              <button
                                key={service.service.id}
                                type="button"
                                onClick={() =>
                                  setState((current) => ({
                                    ...current,
                                    serviceCode: service.service.code,
                                    workerId: "",
                                    unit: "",
                                  }))
                                }
                                className={cn(
                                  "rounded-2xl border px-4 py-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
                                  active
                                    ? "border-primary bg-primary/5 shadow-sm"
                                    : "border-border bg-card"
                                )}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <p className="font-semibold">{serviceLabel}</p>
                                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                      {pickLocalized(service.service.description, locale) ??
                                        service.service.category}
                                    </p>
                                  </div>
                                  <Badge variant="secondary" className="rounded-full">
                                    {service.workers.length}
                                  </Badge>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm font-semibold">{t("selectWorker")}</p>
                      {!selectedService ? (
                        <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground">
                          {t("chooseWorkerHint")}
                        </div>
                      ) : visibleWorkers.length === 0 ? (
                        <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                          {t("chooseWorkerHint")}
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {visibleWorkers.map((worker) => {
                            const active = worker.id === state.workerId
                            const bestPrice = worker.pricing[0]
                            return (
                              <button
                                key={worker.id}
                                type="button"
                                onClick={() =>
                                  setState((current) => ({
                                    ...current,
                                    workerId: worker.id,
                                    unit: "",
                                  }))
                                }
                                className={cn(
                                  "rounded-2xl border px-4 py-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
                                  active
                                    ? "border-primary bg-primary/5 shadow-sm"
                                    : "border-border bg-card"
                                )}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    <p className="font-semibold">
                                      {worker.full_name || "Anonymous worker"}
                                    </p>
                                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                      {worker.worker_profile?.title || workerTitle}
                                    </p>
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                                        <MapPin className="size-3.5" />
                                        {worker.worker_profile?.work_locations?.[0]?.label_snapshot ||
                                          workerLocation}
                                      </span>
                                      {bestPrice ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                                          <Sparkles className="size-3.5" />
                                          {format(bestPrice.price_vnd ?? bestPrice.price)}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                  <Badge
                                    variant={active ? "default" : "secondary"}
                                    className="rounded-full"
                                  >
                                    {active ? "Selected" : "Pick"}
                                  </Badge>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedService ? (
                    <div className="grid gap-4 rounded-3xl border bg-muted/30 p-4 md:grid-cols-[1fr_1fr_1fr]">
                      <div className="grid gap-2">
                        <Label>{t("date")}</Label>
                        <DatePicker
                          value={state.date}
                          onChange={(value) => setField("date", value)}
                          fromDate={new Date()}
                          toDate={endOfRange(new Date())}
                          buttonClassName="bg-background"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>{t("time")}</Label>
                        <Select value={state.time} onValueChange={(value) => setField("time", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("time")} />
                          </SelectTrigger>
                          <SelectContent>
                            {HOUR_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>{t("quantity")}</Label>
                        <Input
                          type="number"
                          min={1}
                          max={1000}
                          value={state.quantity}
                          onChange={(event) => {
                            const raw = event.target.value
                            if (raw === "" || /^\d+$/.test(raw)) {
                              setField("quantity", raw)
                            }
                          }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {pricingOptions.length > 0 ? (
                    <div className="grid gap-2">
                      <Label>{t("unit")}</Label>
                      <Select
                        value={state.unit}
                        onValueChange={(value) => setField("unit", value as WorkerPricingUnit)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("unit")} />
                        </SelectTrigger>
                        <SelectContent>
                          {pricingOptions.map((price) => (
                            <SelectItem key={price.unit} value={price.unit}>
                              {getPricingUnitLabel(price.unit, tProfile)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  {selectedPricing && totalPrice ? (
                    <div className="rounded-3xl border border-dashed bg-background/70 p-4">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{t("total")}</span>
                        <span className="font-semibold text-foreground">{format(totalPrice)}</span>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          ) : null}

          {step === 2 ? (
            <Card className="border-border/70 bg-card/95">
              <CardHeader className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <CheckCircle2 className="size-5" />
                  {t("reviewTitle")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{t("reviewDesc")}</p>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-3 rounded-3xl border bg-muted/30 p-4 md:grid-cols-2">
                  <ReviewRow label={t("name")} value={state.name} />
                  <ReviewRow label={t("email")} value={state.email} />
                  <ReviewRow label={t("phone")} value={state.phone || "-"} />
                  <ReviewRow label={t("selectService")} value={serviceName || "-"} />
                  <ReviewRow label={t("selectWorker")} value={workerName} />
                  <ReviewRow label={t("schedule")} value={startDateTime ? formatDateLabel(startDateTime, localeTag) : "-"} />
                  <ReviewRow
                    label={t("time")}
                    value={startDateTime ? startDateTime.toLocaleTimeString(localeTag, { hour: "2-digit", minute: "2-digit" }) : "-"}
                  />
                  <ReviewRow
                    label={t("unit")}
                    value={
                      selectedPricing
                        ? getPricingUnitLabel(selectedPricing.unit, tProfile)
                        : "-"
                    }
                  />
                  <ReviewRow label={t("quantity")} value={String(quantity)} />
                  <ReviewRow
                    label={t("total")}
                    value={totalPrice ? format(totalPrice) : "-"}
                  />
                </div>
                {state.notes.trim() ? (
                  <div className="rounded-3xl border bg-background/70 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("notes")}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{state.notes.trim()}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {step === 3 ? (
            <Card className="border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/25">
              <CardContent className="grid gap-4 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                    <ShieldCheck className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                      {t("successTitle")}
                    </p>
                    <h3 className="text-xl font-bold">
                      {submittedBooking?.public_ref ?? "-"}
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("successDesc", { code: submittedBooking?.public_ref ?? "-" })}
                </p>
                {submittedBooking?.public_ref ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={copyTrackingCode}>{t("trackingCode")}</Button>
                    {lookupLink ? (
                      <Button asChild variant="outline">
                        <Link href={lookupLink}>{lookupButtonLabel}</Link>
                      </Button>
                    ) : null}
                    <Button variant="outline" onClick={resetWizard}>
                      {t("continue")}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {step > 0 && step < 3 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((value) => (value - 1) as WizardStep)}
              >
                {t("back")}
              </Button>
            ) : null}
            {step === 0 ? (
              <Button type="button" onClick={handleInfoNext} disabled={!canContinueFromInfo}>
                {t("continue")}
                <ChevronRight className="size-4" />
              </Button>
            ) : null}
            {step === 1 ? (
              <Button type="button" onClick={handleServiceNext}>
                {t("continue")}
                <ChevronRight className="size-4" />
              </Button>
            ) : null}
            {step === 2 ? (
              <Button type="button" onClick={handleSubmit} disabled={createBooking.isPending}>
                {createBooking.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {t("submit")}
              </Button>
            ) : null}
            {step === 3 ? (
              <Button asChild variant="outline">
                <Link href="/booking-process">{t("entryButton")}</Link>
              </Button>
            ) : null}
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Card className="border-border/70 bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="size-5 text-amber-500" />
                {t("entryTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>{t("entryBody")}</p>
              <Button asChild className="w-full">
                <Link href="/booking-process">{t("entryButton")}</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/95">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock3 className="size-5" />
                {t("stepSend")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>{t("sendDesc")}</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
                  <span>{t("guestBadge")} contact is captured for follow-up.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
                  <span>Worker sees guest booking in the normal list.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
                  <span>Tracking code can be used later if you need support.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background/85 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}
