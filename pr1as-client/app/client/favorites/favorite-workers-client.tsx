"use client"

import Image from "next/image"
import Link from "next/link"
import { Heart, Loader2, Trash2 } from "lucide-react"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { WorkerTitleOverlayBadge } from "@/components/worker/worker-title-overlay-badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useFavoriteWorkers,
  useToggleFavoriteWorker,
} from "@/lib/hooks/use-worker"
import type { WorkerFavorite } from "@/types"

const workerCardGridClassName =
  "flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 md:grid-cols-4 lg:grid-cols-6 scrollbar-none"

function FavoriteSkeleton() {
  return (
    <div className={workerCardGridClassName}>
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex-none w-[44vw] snap-start overflow-hidden rounded-2xl border border-border bg-card sm:w-auto"
        >
          <Skeleton className="aspect-[3/4] w-full rounded-none" />
          <div className="px-2.5 pt-2 pb-2.5">
            <Skeleton className="h-4 w-2/3" />
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
  const imageSrc =
    worker.avatar ?? worker.worker_profile?.gallery_urls?.[0] ?? null

  return (
    <article className="group relative flex-none w-[44vw] snap-start overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md sm:w-auto">
      <Link
        href={`/worker/${worker.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block cursor-pointer"
      >
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={worker.full_name ?? "Worker"}
              fill
              sizes="(min-width: 1024px) 16vw, (min-width: 640px) 25vw, 44vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
              Chưa có ảnh
            </div>
          )}
          {worker.worker_profile?.title ? (
            <WorkerTitleOverlayBadge title={worker.worker_profile.title} />
          ) : null}
        </div>
        <div className="px-2.5 pt-2 pb-2.5">
          <p className="line-clamp-1 text-sm font-semibold leading-tight text-foreground">
            {worker.full_name ?? "Chưa cập nhật tên"}
          </p>
        </div>
      </Link>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            type="button"
            aria-label="Remove favorite worker"
            title="Xóa khỏi yêu thích"
            disabled={isPending}
            className="absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full border border-white/50 bg-background/85 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-red-500 disabled:opacity-70"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa worker yêu thích?</AlertDialogTitle>
            <AlertDialogDescription>
              Worker này sẽ bị xóa khỏi danh sách yêu thích của bạn. Bạn có
              chắc chắn muốn tiếp tục?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onRemove(worker.id)}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
        onSuccess: () => toast.success("Đã bỏ worker khỏi danh sách yêu thích."),
        onError: () => toast.error("Không thể cập nhật danh sách yêu thích."),
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
            Worker yêu thích
          </h1>
          <p className="text-sm text-muted-foreground">
            Danh sách worker bạn đã lưu từ trang dịch vụ.
          </p>
        </div>
      </div>

      {favoritesQuery.isLoading ? <FavoriteSkeleton /> : null}

      {!favoritesQuery.isLoading && favoritesQuery.isError ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Không thể tải danh sách worker yêu thích.
        </div>
      ) : null}

      {!favoritesQuery.isLoading &&
      !favoritesQuery.isError &&
      favorites.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-medium">Chưa có worker yêu thích</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Bấm icon tim trên worker card để lưu worker vào danh sách này.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/services">Tìm worker</Link>
          </Button>
        </div>
      ) : null}

      {!favoritesQuery.isLoading && favorites.length > 0 ? (
        <div className={workerCardGridClassName}>
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
