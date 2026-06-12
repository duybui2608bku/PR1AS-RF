"use client"

import { useRef } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Star,
  UserRound,
} from "lucide-react"
import { useTranslations } from "next-intl"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useWorkerSuggestions } from "@/lib/hooks/use-worker"
import { cn } from "@/lib/utils"
import type { WorkerServicePricing, WorkerSuggestion } from "@/types"

type Props = {
  workerId: string
  limit?: number
}

const getServiceName = (service: WorkerSuggestion["matched_service"]) =>
  service.name.vi ??
  service.name.en ??
  service.name.zh ??
  service.name.ko ??
  service.code

const getInitials = (name: string | null) =>
  (name?.trim().charAt(0) || "?").toUpperCase()

type Translator = ReturnType<typeof useTranslations>

const UNIT_KEY: Record<string, string> = {
  HOURLY: "enums.unitHourly",
  DAILY: "enums.unitDaily",
  MONTHLY: "enums.unitMonthly",
}

const formatPrice = (pricing: WorkerServicePricing | null, t: Translator) => {
  if (!pricing) return t("suggestions.noPrice")

  const currencyMap: Record<string, string> = { VND: "đ", USD: "$" }
  const symbol = currencyMap[pricing.currency] ?? pricing.currency
  const value =
    pricing.currency === "VND"
      ? `${new Intl.NumberFormat("vi-VN").format(pricing.price)}${symbol}`
      : `${symbol}${new Intl.NumberFormat("en-US").format(pricing.price)}`
  const unit = t(UNIT_KEY[pricing.unit] ?? "enums.unitMonthly")

  return `${value}/${unit}`
}

const getPriceGapLabel = (percent: number | null, t: Translator) => {
  if (percent === null) return null
  if (percent === 0) return t("suggestions.priceEqual")
  if (percent <= 15) return t("suggestions.priceNear", { percent })
  return t("suggestions.priceGap", { percent })
}

function WorkerSuggestionSkeleton() {
  return (
    <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 xl:mx-0 xl:flex-col xl:overflow-visible xl:px-0 xl:pb-0">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="flex flex-none basis-[40%] snap-start flex-col gap-3 rounded-lg border p-3 xl:w-full xl:basis-auto xl:flex-row"
        >
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function WorkerSuggestions({ workerId, limit = 4 }: Props) {
  const t = useTranslations("WorkerProfile")
  const carouselRef = useRef<HTMLDivElement>(null)
  const {
    data: suggestions = [],
    isLoading,
    isError,
  } = useWorkerSuggestions(workerId, limit)
  const canNavigate = !isLoading && !isError && suggestions.length > 2

  const scrollSuggestions = (direction: -1 | 1) => {
    const carousel = carouselRef.current
    if (!carousel) return

    carousel.scrollBy({
      left: direction * carousel.clientWidth * 0.8,
      behavior: "smooth",
    })
  }

  return (
    <Card className="overflow-hidden xl:sticky xl:top-20">
      <CardHeader className="flex flex-row items-center justify-between gap-3 p-4 pb-2">
        <CardTitle className="text-sm font-semibold">
          {t("suggestions.title")}
        </CardTitle>
        {canNavigate ? (
          <div className="flex items-center gap-1 xl:hidden">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 rounded-full"
              aria-label={t("suggestions.prev")}
              onClick={() => scrollSuggestions(-1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 rounded-full"
              aria-label={t("suggestions.next")}
              onClick={() => scrollSuggestions(1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-2">
        {isLoading ? <WorkerSuggestionSkeleton /> : null}

        {!isLoading && isError ? (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            {t("suggestions.loadError")}
          </p>
        ) : null}

        {!isLoading && !isError && suggestions.length === 0 ? (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            {t("suggestions.empty")}
          </p>
        ) : null}

        {!isLoading && !isError && suggestions.length > 0 ? (
          <div
            ref={carouselRef}
            className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 xl:mx-0 xl:flex-col xl:overflow-visible xl:px-0 xl:pb-0"
          >
            {suggestions.map((worker) => {
              const serviceName = getServiceName(worker.matched_service)
              const priceGapLabel = getPriceGapLabel(
                worker.price_difference_percent,
                t
              )
              const rating = worker.review_stats.average
              const ratingText =
                rating > 0 ? rating.toFixed(1) : t("suggestions.ratingNew")

              return (
                <Link
                  key={worker.id}
                  href={`/worker/${worker.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block flex-none basis-[40%] snap-start rounded-lg border p-3 transition-colors hover:border-primary/60 hover:bg-muted/40 xl:w-full xl:basis-auto"
                >
                  <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:gap-3">
                    <Avatar size="lg" className="size-11 shrink-0">
                      {worker.avatar ? (
                        <AvatarImage
                          src={worker.avatar}
                          alt={worker.full_name ?? "Worker"}
                        />
                      ) : null}
                      <AvatarFallback>
                        {worker.full_name ? (
                          getInitials(worker.full_name)
                        ) : (
                          <UserRound className="size-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-semibold text-foreground">
                          {worker.full_name ?? t("suggestions.noName")}
                        </p>
                        {worker.worker_profile?.title ? (
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {worker.worker_profile.title}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        <Badge
                          variant="secondary"
                          className="max-w-full justify-start truncate"
                        >
                          <span className="truncate">{serviceName}</span>
                        </Badge>
                        {priceGapLabel ? (
                          <Badge
                            variant="outline"
                            className="max-w-full truncate"
                          >
                            {priceGapLabel}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1",
                            rating > 0 && "text-amber-600 dark:text-amber-400"
                          )}
                        >
                          <Star
                            className={cn(
                              "size-3.5",
                              rating > 0 && "fill-amber-400 text-amber-400"
                            )}
                          />
                          {ratingText}
                          {worker.review_stats.total > 0
                            ? ` (${worker.review_stats.total})`
                            : null}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          {worker.completed_bookings}
                        </span>
                      </div>

                      <p className="line-clamp-1 text-xs font-semibold text-primary">
                        {formatPrice(worker.pricing, t)}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
