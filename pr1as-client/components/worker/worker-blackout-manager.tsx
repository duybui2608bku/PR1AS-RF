"use client"

import * as React from "react"
import {
  addMonths,
  format,
  isBefore,
  parseISO,
  startOfDay,
  type Locale,
} from "date-fns"
import { enUS, vi, zhCN } from "date-fns/locale"
import {
  AlertCircle,
  CalendarOff,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  useCreateBlackout,
  useDeleteBlackout,
  useMyBlackouts,
} from "@/lib/hooks/use-worker"
import { type SupportedLocale } from "@/lib/locale"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/utils/error-handler"
import type { WorkerBlackoutItem } from "@/types"

const REASON_MAX = 500
const WINDOW_MONTHS_AHEAD = 6
const WINDOW_DAYS_BACK = 30

const DATE_FNS_LOCALES: Record<SupportedLocale, Locale> = {
  vi,
  en: enUS,
  zh: zhCN,
}

type Translator = ReturnType<typeof useTranslations>

const toDateInputValue = (date: Date) => format(date, "yyyy-MM-dd")

const parseBlackoutDate = (value: string) => {
  const date = parseISO(value)
  return Number.isNaN(date.getTime()) ? new Date(value) : date
}

const formatRange = (
  item: WorkerBlackoutItem,
  t: Translator,
  locale: Locale
) => {
  const start = parseBlackoutDate(item.start_time)
  const end = parseBlackoutDate(item.end_time)
  const startsAtMidnight =
    start.getHours() === 0 &&
    start.getMinutes() === 0 &&
    start.getSeconds() === 0
  const endsAtMidnight =
    end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0

  if (startsAtMidnight && endsAtMidnight) {
    const inclusiveEnd = new Date(end.getTime() - 1)
    const sameDay =
      start.getFullYear() === inclusiveEnd.getFullYear() &&
      start.getMonth() === inclusiveEnd.getMonth() &&
      start.getDate() === inclusiveEnd.getDate()
    if (sameDay) {
      return t("range.allDaySingle", {
        date: format(start, "EEEE, dd/MM/yyyy", { locale }),
      })
    }
    return t("range.allDayRange", {
      start: format(start, "dd/MM/yyyy", { locale }),
      end: format(inclusiveEnd, "dd/MM/yyyy", { locale }),
    })
  }

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()

  if (sameDay) {
    return t("range.timedSameDay", {
      date: format(start, "EEEE, dd/MM/yyyy", { locale }),
      start: format(start, "HH:mm", { locale }),
      end: format(end, "HH:mm", { locale }),
    })
  }

  return t("range.timedRange", {
    start: format(start, "dd/MM/yyyy HH:mm", { locale }),
    end: format(end, "dd/MM/yyyy HH:mm", { locale }),
  })
}

type FormState = {
  startDate: Date | undefined
  endDate: Date | undefined
  allDay: boolean
  startTime: string
  endTime: string
  reason: string
}

const emptyForm = (): FormState => {
  const today = startOfDay(new Date())
  return {
    startDate: today,
    endDate: today,
    allDay: true,
    startTime: "09:00",
    endTime: "17:00",
    reason: "",
  }
}

type AddDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function AddBlackoutDialog({ open, onOpenChange }: AddDialogProps) {
  const t = useTranslations("WorkerBookingSchedule.blackouts")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addTitle")}</DialogTitle>
          <DialogDescription>{t("addDescription")}</DialogDescription>
        </DialogHeader>
        {/* Mount mới mỗi lần mở để form luôn reset (tránh setState trong effect) */}
        {open ? <AddBlackoutForm onClose={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function AddBlackoutForm({ onClose }: { onClose: () => void }) {
  const t = useTranslations("WorkerBookingSchedule.blackouts")
  const [form, setForm] = React.useState<FormState>(emptyForm)
  const [error, setError] = React.useState<string | null>(null)
  const createMutation = useCreateBlackout()

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!form.startDate || !form.endDate) {
      setError(t("errors.missingDates"))
      return
    }

    const startKey = toDateInputValue(form.startDate)
    const endKey = toDateInputValue(form.endDate)

    let startDate: Date
    let endDate: Date

    if (form.allDay) {
      startDate = new Date(`${startKey}T00:00:00`)
      const inclusiveEnd = new Date(`${endKey}T00:00:00`)
      endDate = new Date(inclusiveEnd.getTime() + 24 * 60 * 60 * 1000)
    } else {
      if (!form.startTime || !form.endTime) {
        setError(t("errors.missingTimes"))
        return
      }
      startDate = new Date(`${startKey}T${form.startTime}:00`)
      endDate = new Date(`${endKey}T${form.endTime}:00`)
    }

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setError(t("errors.invalidTime"))
      return
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setError(t("errors.endAfterStart"))
      return
    }

    if (isBefore(startDate, startOfDay(new Date()))) {
      setError(t("errors.pastDate"))
      return
    }

    const reason = form.reason.trim()
    if (reason.length > REASON_MAX) {
      setError(t("errors.reasonTooLong", { max: REASON_MAX }))
      return
    }

    try {
      await createMutation.mutateAsync({
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        reason: reason || undefined,
      })
      toast.success(t("addSuccess"))
      onClose()
    } catch (err) {
      const message = getErrorMessage(err, t("addError"))
      setError(message)
      toast.error(message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{t("fromDate")}</Label>
          <DatePicker
            value={form.startDate}
            fromDate={startOfDay(new Date())}
            captionLayout="dropdown"
            onChange={(date) => {
              update("startDate", date)
              if (date && form.endDate && form.endDate < date) {
                update("endDate", date)
              }
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("toDate")}</Label>
          <DatePicker
            value={form.endDate}
            fromDate={form.startDate ?? startOfDay(new Date())}
            captionLayout="dropdown"
            onChange={(date) => update("endDate", date)}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={form.allDay}
          onCheckedChange={(value) => update("allDay", value === true)}
        />
        {t("allDay")}
      </label>

      {form.allDay ? null : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="blackout-start-time">{t("startTime")}</Label>
            <Input
              id="blackout-start-time"
              type="time"
              value={form.startTime}
              onChange={(e) => update("startTime", e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="blackout-end-time">{t("endTime")}</Label>
            <Input
              id="blackout-end-time"
              type="time"
              value={form.endTime}
              onChange={(e) => update("endTime", e.target.value)}
              required
            />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="blackout-reason">{t("reasonLabel")}</Label>
        <Textarea
          id="blackout-reason"
          value={form.reason}
          onChange={(e) => update("reason", e.target.value)}
          placeholder={t("reasonPlaceholder")}
          maxLength={REASON_MAX}
          rows={3}
        />
        <p className="text-right text-xs text-muted-foreground">
          {form.reason.length}/{REASON_MAX}
        </p>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={createMutation.isPending}
        >
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}
          {t("save")}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function WorkerBlackoutManager() {
  const t = useTranslations("WorkerBookingSchedule.blackouts")
  const locale = useLocale() as SupportedLocale
  const dateFnsLocale = DATE_FNS_LOCALES[locale]
  const range = React.useMemo(() => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(start.getDate() - WINDOW_DAYS_BACK)
    const end = addMonths(now, WINDOW_MONTHS_AHEAD)
    return {
      start_date: start.toISOString(),
      end_date: end.toISOString(),
    }
  }, [])

  const blackoutsQuery = useMyBlackouts(range)
  const deleteMutation = useDeleteBlackout()
  const formatBlackoutRange = React.useCallback(
    (item: WorkerBlackoutItem) => formatRange(item, t, dateFnsLocale),
    [dateFnsLocale, t]
  )

  const [addOpen, setAddOpen] = React.useState(false)
  const [pendingDelete, setPendingDelete] =
    React.useState<WorkerBlackoutItem | null>(null)

  const items = React.useMemo(() => {
    const data = blackoutsQuery.data ?? []
    return [...data].sort(
      (a, b) =>
        parseBlackoutDate(a.start_time).getTime() -
        parseBlackoutDate(b.start_time).getTime()
    )
  }, [blackoutsQuery.data])

  const now = new Date()
  const upcoming = items.filter(
    (item) => parseBlackoutDate(item.end_time).getTime() > now.getTime()
  )
  const past = items.filter(
    (item) => parseBlackoutDate(item.end_time).getTime() <= now.getTime()
  )

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteMutation.mutateAsync(pendingDelete.id)
      toast.success(t("deleteSuccess"))
      setPendingDelete(null)
    } catch (err) {
      toast.error(getErrorMessage(err, t("deleteError")))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CalendarOff className="size-5" />
            {t("title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => blackoutsQuery.refetch()}
            disabled={blackoutsQuery.isFetching}
            aria-label={t("refresh")}
            title={t("refresh")}
          >
            {blackoutsQuery.isFetching ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </Button>
          <Button
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="size-4" />
            {t("addButton")}
          </Button>
        </div>
      </div>

      {blackoutsQuery.isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl border bg-card shadow-sm">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : blackoutsQuery.isError ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border bg-card px-4 text-center shadow-sm">
          <AlertCircle className="size-9 text-red-600 dark:text-red-400" />
          <div>
            <p className="font-medium">{t("loadErrorTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("loadErrorDescription")}
            </p>
          </div>
          <Button variant="outline" onClick={() => blackoutsQuery.refetch()}>
            {t("tryAgain")}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border bg-card px-4 text-center shadow-sm">
          <CalendarOff className="size-9 text-muted-foreground" />
          <p className="font-medium">{t("emptyTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {t("emptyDescription")}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <BlackoutSection
            title={t("upcoming")}
            items={upcoming}
            onDelete={setPendingDelete}
            formatRange={formatBlackoutRange}
            deleteAria={t("deleteAria")}
            deletingId={
              deleteMutation.isPending ? deleteMutation.variables : null
            }
            emptyText={t("emptyUpcoming")}
          />
          {past.length > 0 ? (
            <BlackoutSection
              title={t("past")}
              items={past}
              onDelete={setPendingDelete}
              formatRange={formatBlackoutRange}
              deleteAria={t("deleteAria")}
              deletingId={
                deleteMutation.isPending ? deleteMutation.variables : null
              }
              muted
            />
          ) : null}
        </div>
      )}

      <AddBlackoutDialog open={addOpen} onOpenChange={setAddOpen} />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? formatBlackoutRange(pendingDelete) : ""}
              <br />
              {t("deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void handleConfirmDelete()
              }}
              disabled={deleteMutation.isPending}
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

type SectionProps = {
  title: string
  items: WorkerBlackoutItem[]
  onDelete: (item: WorkerBlackoutItem) => void
  formatRange: (item: WorkerBlackoutItem) => string
  deleteAria: string
  deletingId: string | null | undefined
  muted?: boolean
  emptyText?: string
}

function BlackoutSection({
  title,
  items,
  onDelete,
  formatRange,
  deleteAria,
  deletingId,
  muted,
  emptyText,
}: SectionProps) {
  return (
    <section className="space-y-2">
      <h3 className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title} · {items.length}
      </h3>
      {items.length === 0 && emptyText ? (
        <p className="rounded-2xl border border-dashed bg-card px-4 py-4 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <ul
          className={cn(
            "overflow-hidden rounded-2xl border bg-card shadow-sm",
            muted && "opacity-70"
          )}
        >
          {items.map((item, index) => (
            <li
              key={item.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3",
                index < items.length - 1 && "border-b"
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full",
                  muted
                    ? "bg-muted text-muted-foreground"
                    : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                )}
              >
                <CalendarOff className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {formatRange(item)}
                </div>
                {item.reason ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {item.reason}
                  </p>
                ) : null}
              </div>
              {!muted ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={deleteAria}
                  onClick={() => onDelete(item)}
                  disabled={deletingId === item.id}
                  className="size-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  {deletingId === item.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
