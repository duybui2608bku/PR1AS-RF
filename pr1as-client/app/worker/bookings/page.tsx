"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  CalendarCheck2,
  CheckCircle2,
  Eye,
  FilterX,
  Info,
  Loader2,
  MessageSquare,
  PlayCircle,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"
import type { DateRange } from "react-day-picker"

import { AuthGuard } from "@/components/auth/auth-guard"
import { SiteLayout } from "@/components/layout/site-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table } from "@/components/ui/table"
import { BookingCountdown } from "@/components/booking/booking-countdown"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  useCancelBooking,
  useMyBookings,
  useUpdateBooking,
  useUpdateBookingStatus,
} from "@/lib/hooks/use-bookings"
import { useCreateComplaintConversation } from "@/lib/hooks/use-chat"
import { INTL_LOCALE_TAGS, type SupportedLocale } from "@/lib/locale"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/utils/error-handler"
import {
  BookingStatus,
  type Booking,
  type BookingListQuery,
  type CancelBookingPayload,
  type UpdateBookingPayload,
  type UpdateBookingStatusPayload,
} from "@/types/booking"

import {
  WorkerBookingActionDialog,
  type WorkerBookingAction,
} from "./components/worker-booking-action-dialog"
import {
  WorkerBookingActionSheet,
  type WorkerBookingSheetItem,
} from "./components/worker-booking-action-sheet"
import { WorkerBookingCard } from "./components/worker-booking-card"
import { WorkerBookingsMobileFilters } from "./components/worker-bookings-mobile-filters"
import { CustomerProfileSheet } from "./components/customer-profile-sheet"
import {
  bookingStatusBadgeClass,
  formatDateTime,
  getBookingId,
  getBookingCustomerLabel,
  getBookingCustomerLine,
  getConfirmationDeadline,
  isGuestBooking,
  getServiceLabel,
  isBookingExpired,
} from "./format"

const PAGE_SIZE = 10

type WorkerBookingsTranslator = ReturnType<typeof useTranslations>
type BookingAudienceFilter = "all" | "guest" | "registered"

const BOOKING_STATUS_OPTIONS: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.PENDING_CLIENT_ACCEPTANCE,
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
  BookingStatus.REJECTED,
  BookingStatus.DISPUTED,
  BookingStatus.EXPIRED,
]

const buildStatusAction = (
  status: BookingStatus,
  t: WorkerBookingsTranslator
): WorkerBookingAction => {
  switch (status) {
    case BookingStatus.CONFIRMED:
      return {
        type: "status",
        status,
        title: t("statusActions.confirm.title"),
        description: t("statusActions.confirm.description"),
        confirmLabel: t("statusActions.confirm.confirm"),
      }
    case BookingStatus.REJECTED:
      return {
        type: "status",
        status,
        title: t("statusActions.reject.title"),
        description: t("statusActions.reject.description"),
        confirmLabel: t("statusActions.reject.confirm"),
        destructive: true,
      }
    case BookingStatus.IN_PROGRESS:
      return {
        type: "status",
        status,
        title: t("statusActions.start.title"),
        description: t("statusActions.start.description"),
        confirmLabel: t("statusActions.start.confirm"),
      }
    case BookingStatus.PENDING_CLIENT_ACCEPTANCE:
      return {
        type: "status",
        status,
        title: t("statusActions.sendCompletion.title"),
        description: t("statusActions.sendCompletion.description"),
        confirmLabel: t("statusActions.sendCompletion.confirm"),
      }
    case BookingStatus.COMPLETED:
      return {
        type: "status",
        status,
        title: t("statusActions.complete.title"),
        description: t("statusActions.complete.description"),
        confirmLabel: t("statusActions.complete.confirm"),
      }
    default:
      return {
        type: "status",
        status,
        title: t("statusActions.update.title"),
        description: t("statusActions.update.description"),
        confirmLabel: t("statusActions.update.confirm"),
      }
  }
}

const buildCancelAction = (
  t: WorkerBookingsTranslator
): WorkerBookingAction => ({
  type: "cancel",
  title: t("statusActions.cancel.title"),
  description: t("statusActions.cancel.description"),
  confirmLabel: t("statusActions.cancel.confirm"),
  destructive: true,
})

const buildResponseAction = (
  booking: Booking,
  t: WorkerBookingsTranslator
): WorkerBookingAction => ({
  type: "response",
  title: t("statusActions.response.title"),
  description: t("statusActions.response.description"),
  confirmLabel: t("statusActions.response.confirm"),
  initialResponse: booking.worker_response ?? "",
})

function getAvailableActions(
  booking: Booking,
  expired: boolean,
  t: WorkerBookingsTranslator
): WorkerBookingAction[] {
  if (expired) return []

  switch (booking.status) {
    case BookingStatus.PENDING:
      return [
        buildStatusAction(BookingStatus.CONFIRMED, t),
        buildStatusAction(BookingStatus.REJECTED, t),
        buildResponseAction(booking, t),
        buildCancelAction(t),
      ]
    case BookingStatus.CONFIRMED:
      return [
        buildStatusAction(BookingStatus.IN_PROGRESS, t),
        buildResponseAction(booking, t),
        buildCancelAction(t),
      ]
    case BookingStatus.IN_PROGRESS:
      return [
        buildStatusAction(BookingStatus.PENDING_CLIENT_ACCEPTANCE, t),
        buildResponseAction(booking, t),
        buildCancelAction(t),
      ]
    default:
      return []
  }
}

function getActionIcon(action: WorkerBookingAction) {
  if (action.type === "cancel") return XCircle
  if (action.type === "response") return MessageSquare
  if (action.status === BookingStatus.IN_PROGRESS) return PlayCircle
  if (action.status === BookingStatus.REJECTED) return XCircle
  return CheckCircle2
}

function getActionValue(action: WorkerBookingAction) {
  return action.type === "status" ? `status-${action.status}` : action.type
}

export default function WorkerBookingsPage() {
  const router = useRouter()
  const t = useTranslations("WorkerBookings")
  const tQuick = useTranslations("QuickBooking")
  const tStatus = useTranslations("Bookings.statusLabels")
  const locale = useLocale() as SupportedLocale
  const localeTag = INTL_LOCALE_TAGS[locale] ?? INTL_LOCALE_TAGS.vi
  const [page, setPage] = React.useState(1)
  const [statusInput, setStatusInput] = React.useState<"all" | BookingStatus>(
    "all"
  )
  const [serviceCodeInput, setServiceCodeInput] = React.useState("")
  const [searchInput, setSearchInput] = React.useState("")
  const [guestFilterInput, setGuestFilterInput] =
    React.useState<BookingAudienceFilter>("all")
  const [dateRangeInput, setDateRangeInput] = React.useState<
    DateRange | undefined
  >(undefined)
  const [statusFilter, setStatusFilter] = React.useState<"all" | BookingStatus>(
    "all"
  )
  const [serviceCodeFilter, setServiceCodeFilter] = React.useState("")
  const [searchFilter, setSearchFilter] = React.useState("")
  const [guestFilter, setGuestFilter] =
    React.useState<BookingAudienceFilter>("all")
  const [dateRangeFilter, setDateRangeFilter] = React.useState<
    DateRange | undefined
  >(undefined)
  const [actionTarget, setActionTarget] = React.useState<{
    booking: Booking
    action: WorkerBookingAction
  } | null>(null)
  const [sheetBooking, setSheetBooking] = React.useState<Booking | null>(null)
  const [profileBooking, setProfileBooking] = React.useState<Booking | null>(
    null
  )
  const [complaintLoadingId, setComplaintLoadingId] = React.useState<
    string | null
  >(null)

  const statusOptions = React.useMemo<
    { value: "all" | BookingStatus; label: string }[]
  >(
    () => [
      { value: "all", label: t("allStatus") },
      ...BOOKING_STATUS_OPTIONS.map((status) => ({
        value: status,
        label: tStatus(status),
      })),
    ],
    [t, tStatus]
  )

  const query = React.useMemo<BookingListQuery>(
    () => ({
      page,
      limit: PAGE_SIZE,
      role: "worker",
      status: statusFilter === "all" ? undefined : statusFilter,
      service_code: serviceCodeFilter || undefined,
      search: searchFilter || undefined,
      is_guest:
        guestFilter === "all" ? undefined : guestFilter === "guest",
      start_date: dateRangeFilter?.from
        ? dateRangeFilter.from.toISOString()
        : undefined,
      end_date: dateRangeFilter?.to
        ? dateRangeFilter.to.toISOString()
        : undefined,
    }),
    [page, statusFilter, serviceCodeFilter, searchFilter, guestFilter, dateRangeFilter]
  )

  const bookingsQuery = useMyBookings(query)
  const updateStatusMutation = useUpdateBookingStatus()
  const updateBookingMutation = useUpdateBooking()
  const cancelMutation = useCancelBooking()
  const complaintMutation = useCreateComplaintConversation()

  const bookings = bookingsQuery.data?.data ?? []
  const pagination = bookingsQuery.data?.pagination
  const totalPages = pagination?.totalPages ?? 0
  const total = pagination?.total ?? 0
  const canGoBack = page > 1
  const canGoNext = totalPages ? page < totalPages : false

  const handleApplyFilters = () => {
    setStatusFilter(statusInput)
    setServiceCodeFilter(serviceCodeInput.trim().toUpperCase())
    setSearchFilter(searchInput.trim())
    setGuestFilter(guestFilterInput)
    setDateRangeFilter(dateRangeInput)
    setPage(1)
  }

  const handleResetFilters = () => {
    setStatusInput("all")
    setStatusFilter("all")
    setServiceCodeInput("")
    setServiceCodeFilter("")
    setSearchInput("")
    setSearchFilter("")
    setGuestFilterInput("all")
    setGuestFilter("all")
    setDateRangeInput(undefined)
    setDateRangeFilter(undefined)
    setPage(1)
  }

  const handleMobileStatusChange = (value: "all" | BookingStatus) => {
    setStatusInput(value)
    setStatusFilter(value)
    setPage(1)
  }

  const advancedFilterCount =
    (serviceCodeFilter ? 1 : 0) +
    (searchFilter ? 1 : 0) +
    (guestFilter !== "all" ? 1 : 0) +
    (dateRangeFilter?.from ? 1 : 0)

  const handleStatusSubmit = async (values: UpdateBookingStatusPayload) => {
    if (!actionTarget) return
    await updateStatusMutation.mutateAsync({
      id: getBookingId(actionTarget.booking),
      payload: values,
    })
    setActionTarget(null)
  }

  const handleCancelSubmit = async (values: CancelBookingPayload) => {
    if (!actionTarget) return
    await cancelMutation.mutateAsync({
      id: getBookingId(actionTarget.booking),
      payload: values,
    })
    setActionTarget(null)
  }

  const handleResponseSubmit = async (values: UpdateBookingPayload) => {
    if (!actionTarget) return
    await updateBookingMutation.mutateAsync({
      id: getBookingId(actionTarget.booking),
      payload: values,
    })
    setActionTarget(null)
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
    const actions = getAvailableActions(booking, expired, t)
    const complaintLoading = complaintLoadingId === bookingId
    const hasComplaintAction = booking.status === BookingStatus.DISPUTED
    const hasActions = hasComplaintAction || actions.length > 0

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
      if (value === "complaint") {
        handleOpenComplaintGroup(booking)
        return
      }

      const selectedAction = actions.find(
        (action) => getActionValue(action) === value
      )

      if (selectedAction) {
        setActionTarget({ booking, action: selectedAction })
      }
    }

    return (
      <div className="flex justify-end">
        <Select
          value=""
          onValueChange={handleActionChange}
          disabled={complaintLoading}
        >
          <SelectTrigger
            aria-label={t("selectActionAria")}
            className="h-9 w-full min-w-40 cursor-pointer px-3 data-[size=default]:h-9 md:w-44"
          >
            {complaintLoading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : null}
            <SelectValue placeholder={t("selectAction")} />
          </SelectTrigger>
          <SelectContent align="end" className="min-w-52">
            {hasComplaintAction ? (
              <SelectItem
                value="complaint"
                className="cursor-pointer py-2 pr-8 pl-2.5"
              >
                <MessageSquare className="size-4" />
                {t("complaintGroup")}
              </SelectItem>
            ) : null}
            {actions.map((action) => {
              const Icon = getActionIcon(action)
              const actionValue = getActionValue(action)

              return (
                <SelectItem
                  key={`${bookingId}-${actionValue}`}
                  value={actionValue}
                  className={cn(
                    "cursor-pointer py-2 pr-8 pl-2.5",
                    action.destructive &&
                      "text-destructive focus:text-destructive"
                  )}
                >
                  <Icon className="size-4" />
                  {action.confirmLabel}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>
    )
  }

  const sheetItems: WorkerBookingSheetItem[] = []
  if (sheetBooking) {
    const booking = sheetBooking
    const bookingId = getBookingId(booking)
    const expired = isBookingExpired(
      booking.schedule,
      booking.status,
      booking.created_at
    )
    if (booking.status === BookingStatus.DISPUTED) {
      sheetItems.push({
        key: "complaint",
        label: t("openComplaintGroup"),
        icon: MessageSquare,
        loading: complaintLoadingId === bookingId,
        onSelect: () => {
          setSheetBooking(null)
          handleOpenComplaintGroup(booking)
        },
      })
    }
    getAvailableActions(booking, expired, t).forEach((action) => {
      sheetItems.push({
        key: getActionValue(action),
        label: action.confirmLabel,
        icon: getActionIcon(action),
        destructive: action.destructive,
        onSelect: () => {
          setSheetBooking(null)
          setActionTarget({ booking, action })
        },
      })
    })
  }

  return (
    <SiteLayout hideFooter>
      <AuthGuard>
        <div className="container mx-auto px-4 py-6 md:py-8">
          <div className="mb-5 flex items-center justify-between gap-3 md:mb-6">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
              <CalendarCheck2 className="size-6 md:size-7" />
              {t("title")}
            </h1>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => router.push("/booking-process")}
              aria-label={t("guide")}
              title={t("guide")}
            >
              <Info className="size-4" />
            </Button>
          </div>

          <Card className="mb-5 hidden md:block">
            <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_1.2fr_1.1fr_1fr_auto]">
              <div className="grid gap-2">
                <Label htmlFor="worker-filter-status">{t("status")}</Label>
                <Select
                  value={statusInput}
                  onValueChange={(value) => {
                    setStatusInput(value as "all" | BookingStatus)
                  }}
                >
                  <SelectTrigger
                    id="worker-filter-status"
                    className="h-10 w-full data-[size=default]:h-10"
                  >
                    <SelectValue placeholder={t("statusPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="worker-filter-service">
                  {t("serviceCode")}
                </Label>
                <Input
                  id="worker-filter-service"
                  value={serviceCodeInput}
                  maxLength={40}
                  placeholder={t("serviceCodePlaceholder")}
                  onChange={(event) => setServiceCodeInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleApplyFilters()
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="worker-filter-search">{t("search")}</Label>
                <Input
                  id="worker-filter-search"
                  value={searchInput}
                  maxLength={120}
                  placeholder={tQuick("searchWorker")}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleApplyFilters()
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="worker-filter-audience">
                  {tQuick("guestBooking")}
                </Label>
                <Select
                  value={guestFilterInput}
                  onValueChange={(value) =>
                    setGuestFilterInput(value as BookingAudienceFilter)
                  }
                >
                  <SelectTrigger
                    id="worker-filter-audience"
                    className="h-10 w-full data-[size=default]:h-10"
                  >
                    <SelectValue placeholder={tQuick("guestBooking")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allStatus")}</SelectItem>
                    <SelectItem value="guest">{tQuick("guestBadge")}</SelectItem>
                    <SelectItem value="registered">{t("customer")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("dateRange")}</Label>
                <DateRangePicker
                  value={dateRangeInput}
                  onChange={setDateRangeInput}
                  numberOfMonths={2}
                  align="start"
                />
              </div>
              <div className="flex items-end gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleResetFilters}
                        aria-label={t("resetFilters")}
                      >
                        <FilterX className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("resetFilters")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button className="flex-1" onClick={handleApplyFilters}>
                  <Search className="size-4" />
                  {t("search")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="md:hidden">
            <WorkerBookingsMobileFilters
              statusOptions={statusOptions}
              statusValue={statusFilter}
              onStatusChange={handleMobileStatusChange}
              serviceCode={serviceCodeInput}
              onServiceCodeChange={setServiceCodeInput}
              searchValue={searchInput}
              onSearchValueChange={setSearchInput}
              guestValue={guestFilterInput}
              onGuestValueChange={setGuestFilterInput}
              guestLabel={tQuick("guestBadge")}
              dateRange={dateRangeInput}
              onDateRangeChange={setDateRangeInput}
              advancedFilterCount={advancedFilterCount}
              onApply={handleApplyFilters}
              onReset={handleResetFilters}
            />

            <div className="mt-4 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{t("listTitle")}</span>
                <Badge variant="outline">{total}</Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => bookingsQuery.refetch()}
                disabled={bookingsQuery.isFetching}
                aria-label={t("refreshList")}
              >
                <RefreshCw
                  className={cn(
                    "size-4",
                    bookingsQuery.isFetching && "animate-spin"
                  )}
                />
              </Button>
            </div>

            {bookingsQuery.isLoading ? (
              <div className="flex min-h-48 items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : bookingsQuery.isError ? (
              <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-4 text-center">
                <AlertCircle className="size-9 text-red-600 dark:text-red-400" />
                <p className="text-sm font-medium">{t("loadError")}</p>
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
              <div className="space-y-3">
                {bookings.map((booking) => {
                  const bookingId = getBookingId(booking)
                  const expired = isBookingExpired(
                    booking.schedule,
                    booking.status,
                    booking.created_at
                  )
                  const actions = getAvailableActions(booking, expired, t)
                  const hasActions =
                    booking.status === BookingStatus.DISPUTED ||
                    actions.length > 0
                  return (
                    <WorkerBookingCard
                      key={bookingId}
                      booking={booking}
                      hasActions={hasActions}
                      actionLoading={complaintLoadingId === bookingId}
                      onOpenActions={setSheetBooking}
                      onViewCustomerProfile={setProfileBooking}
                    />
                  )
                })}
              </div>
            )}
          </div>

          <Card className="hidden md:block">
            <CardHeader className="flex flex-row items-center justify-between gap-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{t("listTitle")}</CardTitle>
                <Badge variant="outline">{total}</Badge>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => bookingsQuery.refetch()}
                      disabled={bookingsQuery.isFetching}
                      aria-label={t("refreshList")}
                    >
                      <RefreshCw
                        className={cn(
                          "size-4",
                          bookingsQuery.isFetching && "animate-spin"
                        )}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("refreshList")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardHeader>
            <CardContent className="p-0">
              {bookingsQuery.isLoading ? (
                <div className="flex min-h-48 items-center justify-center">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
              ) : bookingsQuery.isError ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-4 text-center">
                  <AlertCircle className="size-9 text-red-600 dark:text-red-400" />
                  <p className="text-sm font-medium">{t("loadError")}</p>
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
                <div className="overflow-x-auto">
                  <Table className="min-w-[980px]">
                    <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground uppercase">
                      <tr>
                        <th className="px-4 py-3 font-medium">
                          {t("service")}
                        </th>
                        <th className="px-4 py-3 font-medium">
                          {t("customer")}
                        </th>
                        <th className="px-4 py-3 font-medium">
                          {t("appointment")}
                        </th>
                        <th className="px-4 py-3 font-medium">{t("status")}</th>
                        <th className="px-4 py-3 font-medium">{t("notes")}</th>
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

                        return (
                          <tr
                            key={getBookingId(booking)}
                            className="border-b align-top last:border-b-0"
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium">
                                {getServiceLabel(booking, locale)}
                              </div>
                              <div className="text-xs text-muted-foreground uppercase">
                                {booking.service_code}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                                  <span>{getBookingCustomerLabel(booking)}</span>
                                  {isGuestBooking(booking) ? (
                                    <Badge variant="secondary" className="rounded-full">
                                      {tQuick("guestBadge")}
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {getBookingCustomerLine(booking)}
                                </div>
                                {!isGuestBooking(booking) ? (
                                  <button
                                    type="button"
                                    onClick={() => setProfileBooking(booking)}
                                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                                  >
                                    <Eye className="size-3.5" />
                                    {t("viewCustomerProfile")}
                                  </button>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                {formatDateTime(
                                  booking.schedule.start_time,
                                  localeTag
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {t("duration", {
                                  hours: booking.schedule.duration_hours,
                                })}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                                  bookingStatusBadgeClass[displayStatus]
                                )}
                              >
                                {tStatus(displayStatus)}
                              </span>
                              {confirmDeadline ? (
                                <BookingCountdown
                                  deadline={confirmDeadline}
                                  className="mt-1.5"
                                />
                              ) : null}
                            </td>
                            <td className="max-w-[260px] px-4 py-3 text-sm text-muted-foreground">
                              <div className="space-y-2">
                                <div className="line-clamp-3 whitespace-pre-wrap">
                                  {booking.client_notes || "-"}
                                </div>
                                {booking.worker_response ? (
                                  <div className="line-clamp-3 border-t pt-2 whitespace-pre-wrap">
                                    <span className="font-medium text-foreground">
                                      {t("responsePrefix")}{" "}
                                    </span>
                                    {booking.worker_response}
                                  </div>
                                ) : null}
                              </div>
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

          <WorkerBookingActionDialog
            action={actionTarget?.action ?? null}
            loading={
              updateStatusMutation.isPending ||
              updateBookingMutation.isPending ||
              cancelMutation.isPending
            }
            onOpenChange={(open) => {
              if (!open) setActionTarget(null)
            }}
            onStatusSubmit={handleStatusSubmit}
            onResponseSubmit={handleResponseSubmit}
            onCancelSubmit={handleCancelSubmit}
          />

          <WorkerBookingActionSheet
            open={Boolean(sheetBooking)}
            title={sheetBooking ? getServiceLabel(sheetBooking, locale) : ""}
            items={sheetItems}
            onOpenChange={(open) => {
              if (!open) setSheetBooking(null)
            }}
          />

          <CustomerProfileSheet
            open={profileBooking !== null}
            booking={profileBooking}
            onOpenChange={(open) => {
              if (!open) setProfileBooking(null)
            }}
          />
        </div>
      </AuthGuard>
    </SiteLayout>
  )
}
