"use client"

import Image from "next/image"
import Link from "next/link"
import { Heart, Loader2, MapPin, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useFavoriteWorkers,
  useToggleFavoriteWorker,
} from "@/lib/hooks/use-worker"
import { workerService } from "@/services/worker.service"
import type { WorkerFavorite, WorkerServicePricing } from "@/types"

const formatPricing = (pricing: WorkerServicePricing[]) => {
  if (!pricing.length) return "Chua co bang gia"

  const item = [...pricing].sort((a, b) => a.price - b.price)[0]
  const currencyMap: Record<string, string> = { VND: "d", USD: "$" }
  const symbol = currencyMap[item.currency] ?? item.currency
  const value =
    item.currency === "VND"
      ? `${new Intl.NumberFormat("vi-VN").format(item.price)}${symbol}`
      : `${symbol}${new Intl.NumberFormat("en-US").format(item.price)}`
  const unit =
    item.unit === "HOURLY"
      ? "gio"
      : item.unit === "DAILY"
        ? "ngay"
        : "thang"

  return `${value} / ${unit}`
}

const formatLocations = (
  locations: NonNullable<WorkerFavorite["worker_profile"]>["work_locations"] = [],
) => {
  const labels = locations
    .map((location) => location.label_snapshot?.trim())
    .filter((label): label is string => Boolean(label))
  if (!labels.length) return null
  if (labels.length <= 2) return labels.join(" - ")
  return `${labels.slice(0, 2).join(" - ")} +${labels.length - 2}`
}

const getPrimaryService = (worker: WorkerFavorite) => worker.services[0] ?? null

function FavoriteSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-lg border bg-card">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

function FavoriteWorkerCard({
  worker,
  isPending,
  onRemove,
}: {
  worker: WorkerFavorite
  isPending: boolean
  onRemove: (workerId: string) => void
}) {
  const primaryService = getPrimaryService(worker)
  const imageSrc =
    worker.avatar ?? worker.worker_profile?.gallery_urls?.[0] ?? null
  const locationText = formatLocations(worker.worker_profile?.work_locations)

  return (
    <article className="relative overflow-hidden rounded-lg border bg-card">
      <Link href={`/worker/${worker.id}`} className="block">
        <div className="relative aspect-[4/3] bg-muted">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={worker.full_name ?? "Worker"}
              fill
              sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
              Chua co anh
            </div>
          )}
        </div>
        <div className="space-y-3 p-4">
          <div className="min-w-0">
            <p className="line-clamp-1 font-semibold">
              {worker.full_name ?? "Chua cap nhat ten"}
            </p>
            {worker.worker_profile?.title ? (
              <p className="line-clamp-1 text-sm text-muted-foreground">
                {worker.worker_profile.title}
              </p>
            ) : null}
          </div>

          {primaryService?.service ? (
            <Badge variant="secondary" className="max-w-full truncate">
              <span className="truncate">
                {workerService.getFallbackName(primaryService.service.name)}
              </span>
            </Badge>
          ) : null}

          {locationText ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{locationText}</span>
            </p>
          ) : null}

          <p className="text-sm font-semibold text-primary">
            {formatPricing(primaryService?.pricing ?? [])}
          </p>
        </div>
      </Link>

      <Button
        type="button"
        size="icon"
        variant="outline"
        className="absolute right-3 top-3 bg-background/85 backdrop-blur"
        aria-label="Remove favorite worker"
        disabled={isPending}
        onClick={() => onRemove(worker.id)}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
      </Button>
    </article>
  )
}

export function FavoriteWorkersClient() {
  const favoritesQuery = useFavoriteWorkers()
  const toggleFavoriteMutation = useToggleFavoriteWorker()
  const favorites = favoritesQuery.data ?? []

  const handleRemove = (workerId: string) => {
    toggleFavoriteMutation.mutate(
      { workerId, favorite: false },
      {
        onSuccess: () => toast.success("Da bo worker khoi danh sach yeu thich."),
        onError: () => toast.error("Khong the cap nhat danh sach yeu thich."),
      },
    )
  }

  return (
    <main className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-red-50 text-red-600 dark:bg-red-950/30">
          <Heart className="size-5 fill-current" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Worker yeu thich
          </h1>
          <p className="text-sm text-muted-foreground">
            Danh sach worker ban da luu tu trang dich vu.
          </p>
        </div>
      </div>

      {favoritesQuery.isLoading ? <FavoriteSkeleton /> : null}

      {!favoritesQuery.isLoading && favoritesQuery.isError ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Khong the tai danh sach worker yeu thich.
        </div>
      ) : null}

      {!favoritesQuery.isLoading &&
      !favoritesQuery.isError &&
      favorites.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">Chua co worker yeu thich</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Bam icon tim tren worker card de luu worker vao danh sach nay.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/services">Tim worker</Link>
          </Button>
        </div>
      ) : null}

      {!favoritesQuery.isLoading && favorites.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((worker) => (
            <FavoriteWorkerCard
              key={worker.id}
              worker={worker}
              isPending={
                toggleFavoriteMutation.isPending &&
                toggleFavoriteMutation.variables?.workerId === worker.id
              }
              onRemove={handleRemove}
            />
          ))}
        </div>
      ) : null}
    </main>
  )
}
