"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import {
  AlertCircle,
  ArrowRight,
  Heart,
  Info,
  Loader2,
  MapPin,
  Ruler,
  Star,
  Weight,
  X,
  Zap,
} from "lucide-react"
import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BottomSheet, BottomSheetContent, BottomSheetTitle } from "@/components/ui/bottom-sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { serviceService } from "@/services/service.service"
import { useCurrency } from "@/lib/hooks/use-currency"
import type { ServiceTab } from "@/lib/home/home-search-params"
import { workerService, type WorkerGroupedByService } from "@/services/worker.service"

type Worker = WorkerGroupedByService["workers"][number]
type Pricing = Worker["pricing"][number]
type WorkersListTranslator = ReturnType<typeof useTranslations>
type WorkLocation = NonNullable<
  NonNullable<Worker["worker_profile"]>["work_locations"]
>[number]

const formatWorkLocations = (
  locations?: WorkLocation[],
  options?: { full?: boolean },
): string => {
  if (!locations?.length) return ""
  const labels = locations
    .map((loc) => loc.label_snapshot?.trim())
    .filter((label): label is string => Boolean(label))
  if (!labels.length) return ""
  if (options?.full || labels.length <= 2) return labels.join(" · ")
  return `${labels.slice(0, 2).join(" · ")} +${labels.length - 2}`
}

const formatPricing = (
  pricing: Pricing[],
  t: WorkersListTranslator,
  format: (amountVnd: number | null | undefined) => string,
) => {
  if (!pricing.length) return { label: t("pricing.noPrice"), prefix: "" }

  const sorted = [...pricing].sort(
    (a, b) => (a.price_vnd ?? a.price) - (b.price_vnd ?? b.price),
  )
  const item = sorted[0]
  const isMultiple = pricing.length > 1

  const value = format(item.price_vnd ?? item.price)

  const unit =
    item.unit === "HOURLY"
      ? t("pricing.units.hourly")
      : item.unit === "DAILY"
        ? t("pricing.units.daily")
        : item.unit === "MONTHLY"
          ? t("pricing.units.monthly")
          : item.unit.toLowerCase()

  return {
    label: `${value} / ${unit}`,
    prefix: isMultiple ? t("pricing.from") : "",
  }
}

const WorkerExpandedDetails = ({
  worker,
  t,
  priceLabel,
  pricePrefix,
}: {
  worker: Worker
  t: WorkersListTranslator
  priceLabel: string
  pricePrefix: string
}) => {
  const height = worker.worker_profile?.height_cm
  const weight = worker.worker_profile?.weight_kg
  const reputation = worker.reputation_score
  const fullLocation = formatWorkLocations(worker.worker_profile?.work_locations, {
    full: true,
  })
  return (
    <div className="space-y-2 text-left">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          {worker.full_name ?? t("nameFallback")}
        </p>
        {reputation != null ? (
          <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <Star className="size-3 fill-amber-500 text-amber-500" />
            {reputation}
          </span>
        ) : null}
      </div>
      {worker.worker_profile?.introduction ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {worker.worker_profile.introduction.trim()}
        </p>
      ) : null}
      {fullLocation ? (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3 shrink-0" />
          <span>{fullLocation}</span>
        </p>
      ) : null}
      {height != null || weight != null ? (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {height != null ? (
            <span className="flex items-center gap-1">
              <Ruler className="size-3" />
              {height}cm
            </span>
          ) : null}
          {weight != null ? (
            <span className="flex items-center gap-1">
              <Weight className="size-3" />
              {weight}kg
            </span>
          ) : null}
        </div>
      ) : null}
      <p className="border-t border-border pt-2 text-xs font-semibold text-foreground">
        {pricePrefix}
        <span className="text-primary">{priceLabel}</span>
      </p>
    </div>
  )
}

const WorkerCard = ({
  worker,
  isFavorite = false,
  isFavoritePending = false,
  onToggleFavorite,
  t,
}: {
  worker: Worker
  isFavorite?: boolean
  isFavoritePending?: boolean
  onToggleFavorite?: (workerId: string, favorite: boolean) => void
  t: WorkersListTranslator
}) => {
  const imageSrc = worker.avatar ?? worker.worker_profile?.gallery_urls?.[0] ?? null
  const { format } = useCurrency()
  const { label, prefix } = formatPricing(worker.pricing, t, format)
  const height = worker.worker_profile?.height_cm
  const weight = worker.worker_profile?.weight_kg
  const reputation = worker.reputation_score
  const [sheetOpen, setSheetOpen] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressed = useRef(false)
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }
  return (
    <article
      className={[
        "group relative flex-none w-[44vw] overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md sm:w-auto snap-start",
        worker.boost?.boost_tier === 1
          ? "border-yellow-400 ring-1 ring-yellow-300 dark:border-yellow-600"
          : worker.boost?.boost_tier === 2
            ? "border-blue-300 dark:border-blue-700"
            : "border-border",
      ].join(" ")}
    >
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <Link
            href={`/worker/${worker.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block cursor-pointer"
            onTouchStart={() => {
              longPressed.current = false
              cancelLongPress()
              longPressTimer.current = setTimeout(() => {
                longPressed.current = true
                setSheetOpen(true)
              }, 450)
            }}
            onTouchMove={cancelLongPress}
            onTouchEnd={(event) => {
              cancelLongPress()
              if (longPressed.current) {
                event.preventDefault()
              }
            }}
            onTouchCancel={cancelLongPress}
          >
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
            {imageSrc ? (
              <Image
                src={imageSrc}
                alt={worker.full_name ?? t("workerFallback")}
                fill
                sizes="(min-width: 1024px) 16vw, (min-width: 640px) 25vw, 44vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground text-sm">
                {t("noImage")}
              </div>
            )}
            {worker.boost?.boost_tier === 1 && (
              <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold text-yellow-900 shadow">
                <Star className="h-2.5 w-2.5 fill-yellow-900" /> {t("boost.featured")}
              </div>
            )}
            {worker.boost?.boost_tier === 2 && (
              <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                <Zap className="h-2.5 w-2.5" /> {t("boost.active")}
              </div>
            )}
          </div>
          <div className="px-2.5 pt-2 pb-0 flex items-center justify-between gap-1">
            <p className="text-sm font-semibold text-foreground leading-tight line-clamp-1">
              {worker.full_name ?? t("nameFallback")}
            </p>
            {reputation != null ? (
              <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <Star className="size-3 fill-amber-500 text-amber-500" aria-hidden="true" />
                {reputation}
              </span>
            ) : null}
          </div>

          <div className="p-2.5 space-y-1.5">
            {worker.worker_profile?.introduction ? (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {worker.worker_profile.introduction.trim()}
              </p>
            ) : null}

            {(() => {
              const locationText = formatWorkLocations(
                worker.worker_profile?.work_locations,
              )
              if (!locationText) return null
              return (
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground line-clamp-1">
                  <MapPin className="size-3 shrink-0" />
                  <span className="truncate">{locationText}</span>
                </p>
              )
            })()}

            {height != null || weight != null ? (
              <p className="flex items-center gap-3 text-[11px] text-muted-foreground">
                {height != null ? (
                  <span className="flex items-center gap-1">
                    <Ruler className="size-3" aria-hidden="true" />
                    {height}cm
                  </span>
                ) : null}
                {weight != null ? (
                  <span className="flex items-center gap-1">
                    <Weight className="size-3" aria-hidden="true" />
                    {weight}kg
                  </span>
                ) : null}
              </p>
            ) : null}

            <div className="flex items-center justify-between pt-1 border-t border-border">
              <p className="text-xs font-semibold text-foreground">
                {prefix}
                <span className="text-primary">{label}</span>
              </p>
            </div>
          </div>
          </Link>
        </HoverCardTrigger>
        <HoverCardContent side="right" align="start" className="hidden w-72 sm:block">
          <WorkerExpandedDetails worker={worker} t={t} priceLabel={label} pricePrefix={prefix} />
        </HoverCardContent>
      </HoverCard>
      <BottomSheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <BottomSheetContent onOpenAutoFocus={(event) => event.preventDefault()}>
          <div className="px-4 pb-4">
            <BottomSheetTitle className="sr-only">
              {worker.full_name ?? t("nameFallback")}
            </BottomSheetTitle>
            <WorkerExpandedDetails worker={worker} t={t} priceLabel={label} pricePrefix={prefix} />
          </div>
        </BottomSheetContent>
      </BottomSheet>
      {onToggleFavorite ? (
        isFavorite ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                aria-label={t("favorite.removeAria")}
                aria-pressed={isFavorite}
                title={t("favorite.removeTitle")}
                disabled={isFavoritePending}
                className="absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full border border-white/50 bg-background/85 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-red-500 disabled:opacity-70"
              >
                {isFavoritePending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Heart className="size-4 fill-red-500 text-red-500" />
                )}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("favorite.confirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("favorite.confirmDesc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => onToggleFavorite(worker.id, false)}
                >
                  {t("actions.remove")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <button
            type="button"
            aria-label={t("favorite.addAria")}
            aria-pressed={isFavorite}
            title={t("favorite.addTitle")}
            disabled={isFavoritePending}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onToggleFavorite(worker.id, true)
            }}
            className="absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full border border-white/50 bg-background/85 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-red-500 disabled:opacity-70"
          >
            {isFavoritePending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Heart className="size-4" />
            )}
          </button>
        )
      ) : null}
    </article>
  )
}

export type AppliedFilterChip = {
  id: string
  label: string
  description?: string
  onRemove?: () => void
}

type WorkersByServiceListProps = {
  groupedServices: WorkerGroupedByService[]
  hasFetchError?: boolean
  isFetching?: boolean
  appliedFilters?: AppliedFilterChip[]
  onClearAllFilters?: () => void
  onViewAllService?: (code: string, category: ServiceTab) => void
  favoriteWorkerIds?: Set<string>
  favoritePendingWorkerId?: string | null
  onToggleFavorite?: (workerId: string, favorite: boolean) => void
}

const markdownComponents: Components = {
  h2: ({ children }) => (
    <h2 className="mt-6 mb-2 text-base font-semibold text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-4 mb-1.5 text-sm font-semibold text-foreground">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-sm leading-relaxed text-muted-foreground last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mb-3 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>
  ),
  li: ({ children }) => (
    <li className="text-sm leading-relaxed text-muted-foreground">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  hr: () => <hr className="my-5 border-border" />,
}

const FilterChips = ({
  filters,
  onClearAll,
  t,
}: {
  filters: AppliedFilterChip[]
  onClearAll?: () => void
  t: WorkersListTranslator
}) => {
  if (!filters.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">{t("filters.activeLabel")}</span>
      {filters.map((chip) => (
        <Badge key={chip.id} variant="secondary" className="gap-1 pr-1">
          <span>{chip.label}</span>
          {chip.description ? (
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  aria-label={t("filters.viewDescription", { label: chip.label })}
                  className="cursor-pointer rounded-full p-0.5 hover:bg-muted"
                >
                  <Info className="size-3" />
                </button>
              </DialogTrigger>
              <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col gap-0 p-0">
                <DialogHeader className="border-b px-6 py-4">
                  <DialogTitle>{chip.label}</DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto px-6 py-5">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {chip.description}
                  </ReactMarkdown>
                </div>
              </DialogContent>
            </Dialog>
          ) : null}
          {chip.onRemove ? (
            <button
              type="button"
              onClick={chip.onRemove}
              aria-label={t("filters.removeFilter", { label: chip.label })}
              className="rounded-full p-0.5 hover:bg-muted"
            >
              <X className="size-3" />
            </button>
          ) : null}
        </Badge>
      ))}
      {onClearAll ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-6 px-2 text-xs"
        >
          {t("filters.clearAll")}
        </Button>
      ) : null}
    </div>
  )
}

export const WorkersByServiceList = ({
  groupedServices,
  hasFetchError = false,
  isFetching = false,
  appliedFilters = [],
  onClearAllFilters,
  onViewAllService,
  favoriteWorkerIds,
  favoritePendingWorkerId,
  onToggleFavorite,
}: WorkersByServiceListProps) => {
  const t = useTranslations("WorkersByServiceList")
  const locale = useLocale()
  const hasActiveFilters = appliedFilters.length > 0

  if (hasFetchError) {
    return (
      <section className="container mx-auto px-4 pb-16">
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("error.title")}</AlertTitle>
          <AlertDescription>
            {t("error.description")}
          </AlertDescription>
        </Alert>
      </section>
    )
  }

  if (groupedServices.length === 0) {
    return (
      <section className="container mx-auto px-4 pb-16 space-y-4">
        {hasActiveFilters ? (
          <FilterChips filters={appliedFilters} onClearAll={onClearAllFilters} t={t} />
        ) : null}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {isFetching
              ? t("empty.searchingTitle")
              : hasActiveFilters
                ? t("empty.noMatchTitle")
                : t("empty.noDataTitle")}
          </AlertTitle>
          <AlertDescription>
            {isFetching
              ? t("empty.searchingDescription")
              : hasActiveFilters
                ? t("empty.noMatchDescription")
                : t("empty.noDataDescription")}
          </AlertDescription>
        </Alert>
      </section>
    )
  }

  return (
    <section className="container mx-auto px-4 pb-16 space-y-6">
      {hasActiveFilters ? (
        <FilterChips filters={appliedFilters} onClearAll={onClearAllFilters} t={t} />
      ) : null}
      <div
        aria-busy={isFetching}
        className={isFetching ? "space-y-12 opacity-70 transition-opacity" : "space-y-12"}
      >
        {groupedServices.map((group) => {
          const serviceName = workerService.getFallbackName(group.service.name, locale)
          const serviceDescription = group.service.description
            ? serviceService.getDescription(group.service.description, locale)
            : null

          return (
          <div key={group.service.id}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xl font-bold tracking-tight">
                  {serviceName}
                </h3>
                {serviceDescription ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        aria-label={t("service.viewDescription", { service: serviceName })}
                        className="cursor-pointer rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Info className="size-4" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col gap-0 p-0">
                      <DialogHeader className="border-b px-6 py-4">
                        <DialogTitle>
                          {serviceName}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="overflow-y-auto px-6 py-5">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents}
                        >
                          {serviceDescription}
                        </ReactMarkdown>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : null}
              </div>
              <div className="ml-auto flex items-center gap-2 shrink-0">
                <Badge variant="outline">{t("service.workerCount", { count: group.workers.length })}</Badge>
                <button
                  type="button"
                  onClick={() =>
                    onViewAllService?.(
                      group.service.code,
                      group.service.category as ServiceTab,
                    )
                  }
                  className="inline-flex items-center justify-center rounded-full w-7 h-7 border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  aria-label={t("service.viewAll", { service: serviceName })}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="
              flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2
              sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0
              md:grid-cols-4
              lg:grid-cols-6
              scrollbar-none
            ">
              {group.workers.map((worker) => (
                <WorkerCard
                  key={worker.id}
                  worker={worker}
                  isFavorite={favoriteWorkerIds?.has(worker.id) ?? false}
                  isFavoritePending={favoritePendingWorkerId === worker.id}
                  onToggleFavorite={onToggleFavorite}
                  t={t}
                />
              ))}
            </div>
          </div>
          )
        })}
      </div>
    </section>
  )
}
