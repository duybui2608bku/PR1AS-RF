"use client"

import Link from "next/link"
import { CheckCircle2, Star, UserRound } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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

const formatPrice = (pricing: WorkerServicePricing | null) => {
  if (!pricing) return "Chưa có giá"

  const currencyMap: Record<string, string> = { VND: "đ", USD: "$" }
  const symbol = currencyMap[pricing.currency] ?? pricing.currency
  const value =
    pricing.currency === "VND"
      ? `${new Intl.NumberFormat("vi-VN").format(pricing.price)}${symbol}`
      : `${symbol}${new Intl.NumberFormat("en-US").format(pricing.price)}`
  const unit =
    pricing.unit === "HOURLY"
      ? "giờ"
      : pricing.unit === "DAILY"
        ? "ngày"
        : "tháng"

  return `${value}/${unit}`
}

const getPriceGapLabel = (percent: number | null) => {
  if (percent === null) return null
  if (percent === 0) return "Giá tương đương"
  if (percent <= 15) return `Giá gần ${percent}%`
  return `Chênh ${percent}%`
}

function WorkerSuggestionSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex gap-3 rounded-lg border p-3">
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
  const {
    data: suggestions = [],
    isLoading,
    isError,
  } = useWorkerSuggestions(workerId, limit)

  return (
    <Card className="sticky top-20">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-semibold">Worker tương tự</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-2">
        {isLoading ? <WorkerSuggestionSkeleton /> : null}

        {!isLoading && isError ? (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            Chưa tải được worker đề xuất
          </p>
        ) : null}

        {!isLoading && !isError && suggestions.length === 0 ? (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            Chưa có worker phù hợp
          </p>
        ) : null}

        {!isLoading && !isError
          ? suggestions.map((worker) => {
              const serviceName = getServiceName(worker.matched_service)
              const priceGapLabel = getPriceGapLabel(
                worker.price_difference_percent
              )
              const rating = worker.review_stats.average
              const ratingText = rating > 0 ? rating.toFixed(1) : "Mới"

              return (
                <Link
                  key={worker.id}
                  href={`/worker/${worker.id}`}
                  className="group block rounded-lg border p-3 transition-colors hover:border-primary/60 hover:bg-muted/40"
                >
                  <div className="flex gap-3">
                    <Avatar size="lg" className="size-11">
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
                          {worker.full_name ?? "Chưa cập nhật tên"}
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
                          <Badge variant="outline">{priceGapLabel}</Badge>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1",
                            rating > 0 && "text-amber-600"
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
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                          {worker.completed_bookings}
                        </span>
                      </div>

                      <p className="line-clamp-1 text-xs font-semibold text-primary">
                        {formatPrice(worker.pricing)}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })
          : null}
      </CardContent>
    </Card>
  )
}
