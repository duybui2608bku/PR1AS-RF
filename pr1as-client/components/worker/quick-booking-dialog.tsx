"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  User2,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { useCreateGuestBooking } from "@/lib/hooks/use-bookings"
import { INTL_LOCALE_TAGS, type SupportedLocale, pickLocalized } from "@/lib/locale"
import { serviceService } from "@/services/service.service"
import { workerService } from "@/services/worker.service"
import type { Booking, CreateGuestBookingPayload } from "@/types/booking"
import type { WorkerPricingUnit, WorkerServiceItem } from "@/types"

const MIN_ADVANCE_HOURS = 2
const RANGE_DAYS = 30

const HOURS_PER_UNIT: Record<WorkerPricingUnit, number> = {
  HOURLY: 1,
  DAILY: 24,
  MONTHLY: 24 * 30,
}

const HOUR_OPTIONS = Array.from({ length: 15 }, (_, idx) => {
  const hour = 8 + idx
  const label = `${String(hour).padStart(2, "0")}:00`
  return { value: label, label }
})

const startOfDay = (date: Date) => {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

const toIsoDate = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const endOfRange = (date: Date) => {
  const value = new Date(date)
  value.setDate(value.getDate() + RANGE_DAYS)
  return value
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

const formatDateLabel = (date: Date, localeTag: string) =>
  date.toLocaleDateString(localeTag, {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

const unitLabel = (unit: WorkerPricingUnit, tProfile: ReturnType<typeof useTranslations>) => {
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

function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode
  required?: boolean
  htmlFor?: string
}) {
  return (
    <Label htmlFor={htmlFor} className="flex items-center gap-1">
      <span>{children}</span>
      {required ? <span className="text-destructive">*</span> : null}
    </Label>
  )
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  workerId: string
  workerName: string
  services: WorkerServiceItem[]
  initialServiceId?: string | null
}

type Step = 0 | 1 | 2 | 3

type FormState = {
  name: string
  email: string
  phone: string
  notes: string
  serviceId: string
  serviceCode: string
  workerServiceId: string
  unit: WorkerPricingUnit | ""
  quantity: string
  date?: Date
  time: string
}

const initialState: FormState = {
  name: "",
  email: "",
  phone: "",
  notes: "",
  serviceId: "",
  serviceCode: "",
  workerServiceId: "",
  unit: "",
  quantity: "1",
  date: undefined,
  time: "09:00",
}

export function QuickBookingDialog({
  open,
  onOpenChange,
  workerId,
  workerName,
  services,
  initialServiceId,
}: Props) {
  const t = useTranslations("QuickBooking")
  const tCommon = useTranslations("Common")
  const tProfile = useTranslations("WorkerProfile")
  const locale = useLocale() as SupportedLocale
  const localeTag = INTL_LOCALE_TAGS[locale] ?? INTL_LOCALE_TAGS.vi
  const { format } = useCurrency()
  const createBooking = useCreateGuestBooking()
  const [step, setStep] = React.useState<Step>(0)
  const [state, setState] = React.useState<FormState>(initialState)
  const [submittedBooking, setSubmittedBooking] = React.useState<Booking | null>(null)
  const [attemptedStep, setAttemptedStep] = React.useState<Step | null>(null)

  const serviceCatalogQuery = useQuery({
    queryKey: ["quick-booking", "service-catalog"],
    queryFn: serviceService.getServices,
    staleTime: 5 * 60 * 1000,
  })

  const serviceCatalogByCode = React.useMemo(() => {
    const map = new Map<string, NonNullable<typeof serviceCatalogQuery.data>[number]>()
    for (const item of serviceCatalogQuery.data ?? []) {
      map.set(item.code, item)
    }
    return map
  }, [serviceCatalogQuery.data])

  const activeServices = React.useMemo(
    () => services.filter((service) => service.is_active),
    [services]
  )

  const selectedService = React.useMemo(
    () =>
      activeServices.find((service) => service._id === state.workerServiceId) ??
      null,
    [activeServices, state.workerServiceId]
  )

  const selectedCatalog = React.useMemo(() => {
    if (!selectedService) return null
    return serviceCatalogByCode.get(selectedService.service_code) ?? null
  }, [selectedService, serviceCatalogByCode])

  const pricingOptions = selectedService?.pricing ?? []
  const selectedPricing = React.useMemo(() => {
    if (!pricingOptions.length) return null
    return (
      pricingOptions.find((price) => price.unit === state.unit) ??
      pricingOptions[0] ??
      null
    )
  }, [pricingOptions, state.unit])

  const workerScheduleQuery = useQuery({
    queryKey: ["quick-booking", "worker-schedule", workerId],
    queryFn: () =>
      workerService.getWorkerSchedule(workerId, {
        start_date: toIsoDate(startOfDay(new Date())),
        end_date: toIsoDate(endOfRange(new Date())),
      }),
    enabled: Boolean(open),
    staleTime: 30_000,
  })

  const bookedDays = React.useMemo(
    () =>
      computeBookedDays([
        ...(workerScheduleQuery.data?.bookings ?? []),
        ...(workerScheduleQuery.data?.blackouts ?? []),
      ]),
    [workerScheduleQuery.data]
  )

  React.useEffect(() => {
    if (!open) return
    if (!activeServices.length) return
    const preferred =
      initialServiceId &&
      activeServices.find((item) => item._id === initialServiceId)
        ? initialServiceId
        : activeServices[0]?._id ?? ""

    if (
      state.workerServiceId &&
      activeServices.some((item) => item._id === state.workerServiceId)
    ) {
      return
    }
    const first = activeServices.find((item) => item._id === preferred) ?? activeServices[0]
    setState((current) => ({
      ...current,
      workerServiceId: first?._id ?? "",
      serviceId: first?.service_id ?? "",
      serviceCode: first?.service_code ?? "",
      unit: first?.pricing[0]?.unit ?? "",
    }))
  }, [activeServices, initialServiceId, open, state.workerServiceId])

  React.useEffect(() => {
    if (!selectedService) return
    if (state.unit && pricingOptions.some((item) => item.unit === state.unit)) return
    setState((current) => ({
      ...current,
      unit: pricingOptions[0]?.unit ?? "",
    }))
  }, [pricingOptions, selectedService, state.unit])

  const quantity = React.useMemo(() => {
    const parsed = Number.parseInt(state.quantity, 10)
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 1000) : 1
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
    return new Date(startDateTime.getTime() + HOURS_PER_UNIT[state.unit] * quantity * 60 * 60 * 1000)
  }, [quantity, startDateTime, state.unit])

  const fieldErrors = React.useMemo(() => {
    const errors: Partial<Record<keyof FormState | "service", string>> = {}

    if (!state.name.trim()) errors.name = t("validationName")
    if (!state.email.trim()) errors.email = t("validationEmail")
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim())) {
      errors.email = t("validationEmailInvalid")
    }

    if (!selectedService) errors.service = t("validationService")
    if (!state.date) errors.date = t("validationDate")
    if (!state.time) errors.time = t("validationTime")
    if (!state.unit) errors.unit = t("validationUnit")
    if (!selectedPricing) errors.unit = t("validationPriceMissing")
    if (!state.quantity.trim()) errors.quantity = t("validationQuantity")
    else if (!Number.isFinite(Number.parseInt(state.quantity, 10)) || Number.parseInt(state.quantity, 10) < 1) {
      errors.quantity = t("validationQuantity")
    }
    if (selectedPricing && state.date && !startDateTime) {
      errors.time = t("validationTime")
    }

    if (startDateTime) {
      const minStart = new Date(Date.now() + MIN_ADVANCE_HOURS * 60 * 60 * 1000)
      if (startDateTime < minStart) {
        errors.date = t("validationMinAdvance", { hours: MIN_ADVANCE_HOURS })
      }
    }

    if (
      state.date &&
      bookedDays.some((day) => day.toDateString() === state.date?.toDateString())
    ) {
      errors.date = t("validationSchedule")
    }

    return errors
  }, [bookedDays, selectedPricing, selectedService, startDateTime, state.date, state.email, state.name, state.quantity, state.time, state.unit, t])

  const step0Invalid =
    Boolean(fieldErrors.name) || Boolean(fieldErrors.email)
  const step1Invalid =
    Boolean(fieldErrors.service) ||
    Boolean(fieldErrors.date) ||
    Boolean(fieldErrors.time) ||
    Boolean(fieldErrors.unit) ||
    Boolean(fieldErrors.quantity)

  const reset = () => {
    setState(initialState)
    setSubmittedBooking(null)
    setStep(0)
    setAttemptedStep(null)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((current) => ({ ...current, [key]: value }))
  }

  const goNextFromStep0 = () => {
    setAttemptedStep(0)
    if (step0Invalid) {
      toast.error(fieldErrors.name ?? fieldErrors.email ?? t("validationName"))
      return
    }
    setStep(1)
  }

  const goNextFromStep1 = () => {
    setAttemptedStep(1)
    if (step1Invalid) {
      toast.error(
        fieldErrors.service ??
          fieldErrors.date ??
          fieldErrors.time ??
          fieldErrors.unit ??
          fieldErrors.quantity ??
          t("validationService")
      )
      return
    }
    setStep(2)
  }

  const handleSubmit = async () => {
    setAttemptedStep(2)
    if (step0Invalid || step1Invalid || !selectedService || !selectedPricing || !startDateTime || !endDateTime) {
      toast.error(
        fieldErrors.name ??
          fieldErrors.email ??
          fieldErrors.service ??
          fieldErrors.date ??
          fieldErrors.time ??
          fieldErrors.unit ??
          fieldErrors.quantity ??
          t("validationService")
      )
      return
    }
    const payload: CreateGuestBookingPayload = {
      guest_contact: {
        name: state.name.trim(),
        email: state.email.trim().toLowerCase(),
        phone: state.phone.trim() || undefined,
      },
      worker_id: workerId,
      worker_service_id: selectedService._id,
      service_id: selectedService.service_id,
      service_code: selectedService.service_code,
      schedule: {
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
      },
      pricing: {
        unit: selectedPricing.unit,
        quantity,
      },
      client_notes: state.notes.trim() || undefined,
    }

    const booking = await createBooking.mutateAsync(payload)
    setSubmittedBooking(booking ?? null)
    setStep(3)
  }

  const reviewItems = [
    { label: t("name"), value: state.name },
    { label: t("email"), value: state.email },
    { label: t("phone"), value: state.phone || "-" },
    { label: t("selectService"), value: selectedCatalog ? pickLocalized(selectedCatalog.name, locale) ?? selectedService?.service_code ?? "-" : selectedService?.service_code ?? "-" },
    { label: t("date"), value: state.date ? formatDateLabel(state.date, localeTag) : "-" },
    { label: t("time"), value: state.time },
    { label: t("unit"), value: selectedPricing ? unitLabel(selectedPricing.unit, tProfile) : "-" },
    { label: t("quantity"), value: String(quantity) },
  ]

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl overflow-hidden border border-border/60 bg-background/95 p-0 shadow-[0_28px_90px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.02))] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.85),rgba(2,6,23,0.35))]" />
        <div className="relative p-6 md:p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </DialogTitle>
          <DialogDescription className="max-w-2xl text-sm text-muted-foreground">
            {t("subtitle")} {workerName}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-4">
              {[
                t("stepInfo"),
                t("stepService"),
                t("stepReview"),
                t("stepSend"),
              ].map((label, idx) => (
                <div
                  key={label}
                  className={cn(
                    "rounded-2xl border px-3 py-2 text-sm transition-colors",
                    step === idx
                      ? "border-primary/40 bg-primary/10 shadow-sm"
                      : step > idx
                        ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                        : "bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-background text-xs font-semibold">
                      {idx + 1}
                    </span>
                    <span className="font-medium">{label}</span>
                  </div>
                </div>
              ))}
            </div>

            {step === 0 ? (
              <div className="grid gap-4 rounded-[1.5rem] border border-border/70 bg-card/95 p-4 shadow-sm">
                <div className="grid gap-2">
                  <FieldLabel htmlFor="qb-name" required>
                    {t("name")}
                  </FieldLabel>
                  <Input
                    id="qb-name"
                    value={state.name}
                    onChange={(e) => setField("name", e.target.value)}
                    className={cn("h-11 w-full", attemptedStep === 0 && fieldErrors.name && "border-destructive focus-visible:ring-destructive/20")}
                  />
                  {attemptedStep === 0 && fieldErrors.name ? (
                    <p className="text-xs font-medium text-destructive">{fieldErrors.name}</p>
                  ) : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <FieldLabel htmlFor="qb-email" required>
                      {t("email")}
                    </FieldLabel>
                    <Input
                      id="qb-email"
                      type="email"
                      value={state.email}
                      onChange={(e) => setField("email", e.target.value)}
                      className={cn("h-11 w-full", attemptedStep === 0 && fieldErrors.email && "border-destructive focus-visible:ring-destructive/20")}
                    />
                    {attemptedStep === 0 && fieldErrors.email ? (
                      <p className="text-xs font-medium text-destructive">{fieldErrors.email}</p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="qb-phone">{t("phone")}</Label>
                    <Input
                      id="qb-phone"
                      value={state.phone}
                      onChange={(e) => setField("phone", e.target.value)}
                      className="h-11 w-full"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="qb-notes">{t("notes")}</Label>
                  <Textarea
                    id="qb-notes"
                    rows={3}
                    value={state.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="grid gap-4 rounded-[1.5rem] border border-border/70 bg-card/95 p-4 shadow-sm">
                <div className="grid gap-2">
                  <FieldLabel required>{t("selectService")}</FieldLabel>
                  <Select
                    value={state.workerServiceId}
                    onValueChange={(value) => {
                      const service = activeServices.find((item) => item._id === value)
                      setState((current) => ({
                        ...current,
                        workerServiceId: value,
                        serviceId: service?.service_id ?? "",
                        serviceCode: service?.service_code ?? "",
                        unit: service?.pricing[0]?.unit ?? "",
                      }))
                    }}
                  >
                    <SelectTrigger className={cn("h-11 w-full", attemptedStep === 1 && fieldErrors.service && "border-destructive focus:ring-destructive/20")}>
                      <SelectValue placeholder={t("selectService")} />
                    </SelectTrigger>
                    <SelectContent>
                      {activeServices.map((service) => {
                        const catalog = serviceCatalogByCode.get(service.service_code)
                        const label = catalog ? pickLocalized(catalog.name, locale) ?? service.service_code : service.service_code
                        return (
                          <SelectItem key={service._id} value={service._id}>
                            {label}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  {attemptedStep === 1 && fieldErrors.service ? (
                    <p className="text-xs font-medium text-destructive">{fieldErrors.service}</p>
                  ) : null}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <FieldLabel required>{t("date")}</FieldLabel>
                    <DatePicker
                      value={state.date}
                      onChange={(value) => setField("date", value)}
                      fromDate={new Date()}
                      toDate={endOfRange(new Date())}
                      buttonClassName={cn(
                        "h-11 w-full",
                        attemptedStep === 1 && fieldErrors.date && "border-destructive text-destructive",
                      )}
                    />
                    {attemptedStep === 1 && fieldErrors.date ? (
                      <p className="text-xs font-medium text-destructive">{fieldErrors.date}</p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <FieldLabel required>{t("time")}</FieldLabel>
                    <Select value={state.time} onValueChange={(value) => setField("time", value)}>
                      <SelectTrigger className={cn("h-11 w-full", attemptedStep === 1 && fieldErrors.time && "border-destructive focus:ring-destructive/20")}>
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
                    {attemptedStep === 1 && fieldErrors.time ? (
                      <p className="text-xs font-medium text-destructive">{fieldErrors.time}</p>
                    ) : null}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <FieldLabel required>{t("unit")}</FieldLabel>
                    <Select value={state.unit} onValueChange={(value) => setField("unit", value as WorkerPricingUnit)}>
                      <SelectTrigger className={cn("h-11 w-full", attemptedStep === 1 && fieldErrors.unit && "border-destructive focus:ring-destructive/20")}>
                        <SelectValue placeholder={t("unit")} />
                      </SelectTrigger>
                      <SelectContent>
                        {pricingOptions.map((price) => (
                          <SelectItem key={price.unit} value={price.unit}>
                            {unitLabel(price.unit, tProfile)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {attemptedStep === 1 && fieldErrors.unit ? (
                      <p className="text-xs font-medium text-destructive">{fieldErrors.unit}</p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <FieldLabel required>{t("quantity")}</FieldLabel>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      value={state.quantity}
                      onChange={(e) => {
                        const raw = e.target.value
                        if (raw === "" || /^\d+$/.test(raw)) setField("quantity", raw)
                      }}
                      className={cn("h-11 w-full", attemptedStep === 1 && fieldErrors.quantity && "border-destructive focus-visible:ring-destructive/20")}
                    />
                    {attemptedStep === 1 && fieldErrors.quantity ? (
                      <p className="text-xs font-medium text-destructive">{fieldErrors.quantity}</p>
                    ) : null}
                  </div>
                </div>
                {selectedPricing ? (
                  <div className="rounded-2xl border bg-muted/30 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">{t("total")}</span>
                      <span className="font-semibold">
                        {format((selectedPricing.price_vnd ?? selectedPricing.price) * quantity)}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 2 ? (
              <div className="grid gap-3 rounded-[1.5rem] border border-border/70 bg-card/95 p-4 shadow-sm sm:grid-cols-2">
                {reviewItems.map((item) => (
                  <div key={item.label} className="rounded-2xl border bg-background/80 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
                    <p className="mt-1 font-semibold">{item.value}</p>
                  </div>
                ))}
                {state.notes.trim() ? (
                  <div className="sm:col-span-2 rounded-2xl border bg-background/80 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("notes")}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{state.notes.trim()}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 3 ? (
              <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/25">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      {t("successTitle")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("successDesc", { code: submittedBooking?.public_ref ?? "-" })}
                    </p>
                  </div>
                </div>
                {submittedBooking?.public_ref ? (
                  <Badge className="mt-4 rounded-full">{submittedBooking.public_ref}</Badge>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-4 rounded-[1.5rem] border border-border/70 bg-card/90 p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <User2 className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{workerName}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedService
                    ? t("serviceTitle")
                    : t("chooseWorkerHint")}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
              {selectedService ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span>{t("selectService")}</span>
                    <span className="font-medium text-foreground">
                      {selectedCatalog
                        ? pickLocalized(selectedCatalog.name, locale) ??
                          selectedService.service_code
                        : selectedService.service_code}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>{t("date")}</span>
                    <span className="font-medium text-foreground">
                      {state.date ? formatDateLabel(state.date, localeTag) : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>{t("time")}</span>
                    <span className="font-medium text-foreground">
                      {state.time || "-"}
                    </span>
                  </div>
                </div>
              ) : (
                <p>{t("chooseWorkerHint")}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 gap-2">
          {step > 0 && step < 3 ? (
            <Button variant="outline" onClick={() => setStep((value) => (value - 1) as Step)}>
              {t("back")}
            </Button>
          ) : null}
          {step === 0 ? (
            <Button onClick={goNextFromStep0}>
              {t("continue")}
              <ChevronRight className="size-4" />
            </Button>
          ) : null}
          {step === 1 ? (
            <Button onClick={goNextFromStep1}>
              {t("continue")}
              <ChevronRight className="size-4" />
            </Button>
          ) : null}
          {step === 2 ? (
            <Button onClick={handleSubmit} disabled={createBooking.isPending}>
              {createBooking.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("submit")}
            </Button>
          ) : null}
          {step === 3 ? (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              {tCommon("close")}
            </Button>
          ) : null}
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
