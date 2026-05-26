"use client"

import Image from "next/image"
import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  Heart,
  Info,
  Loader2,
  MapPin,
  X,
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
import { WorkerTitleOverlayBadge } from "@/components/worker/worker-title-overlay-badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { serviceService } from "@/services/service.service"
import { workerService, type WorkerGroupedByService } from "@/services/worker.service"

type Worker = WorkerGroupedByService["workers"][number]
type Pricing = Worker["pricing"][number]
type WorkLocation = NonNullable<
  NonNullable<Worker["worker_profile"]>["work_locations"]
>[number]

const formatWorkLocations = (locations?: WorkLocation[]): string => {
  if (!locations?.length) return ""
  const labels = locations
    .map((loc) => loc.label_snapshot?.trim())
    .filter((label): label is string => Boolean(label))
  if (!labels.length) return ""
  if (labels.length <= 2) return labels.join(" · ")
  return `${labels.slice(0, 2).join(" · ")} +${labels.length - 2}`
}

const formatPricing = (pricing: Pricing[]) => {
  if (!pricing.length) return { label: "Chưa có bảng giá", prefix: "" }

  const sorted = [...pricing].sort((a, b) => a.price - b.price)
  const item = sorted[0]
  const isMultiple = pricing.length > 1

  const currencyMap: Record<string, string> = { VND: "đ", USD: "$" }
  const symbol = currencyMap[item.currency] ?? item.currency

  const value =
    item.currency === "VND"
      ? new Intl.NumberFormat("vi-VN").format(item.price) + symbol
      : symbol + new Intl.NumberFormat("en-US").format(item.price)

  const unit = item.unit === "HOURLY" ? "giờ" : item.unit === "DAILY" ? "ngày" : item.unit.toLowerCase()

  return {
    label: `${value} / ${unit}`,
    prefix: isMultiple ? "Từ " : "",
  }
}

const WorkerCard = ({
  worker,
  isFavorite = false,
  isFavoritePending = false,
  onToggleFavorite,
}: {
  worker: Worker
  isFavorite?: boolean
  isFavoritePending?: boolean
  onToggleFavorite?: (workerId: string, favorite: boolean) => void
}) => {
  const imageSrc = worker.avatar ?? worker.worker_profile?.gallery_urls?.[0] ?? null
  const { label, prefix } = formatPricing(worker.pricing)
  return (
    <article className="group relative flex-none w-[44vw] overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md sm:w-auto snap-start">
      <Link href={`/worker/${worker.id}`} className="block cursor-pointer">
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
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground text-sm">
            Chưa có ảnh
          </div>
        )}
        {worker.worker_profile?.title ? (
          <WorkerTitleOverlayBadge title={worker.worker_profile.title} />
        ) : null}
      </div>
      <div className="px-2.5 pt-2 pb-0">
        <p className="text-sm font-semibold text-foreground leading-tight line-clamp-1">
          {worker.full_name ?? "Chưa cập nhật tên"}
        </p>
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

        <div className="flex items-center justify-between pt-1 border-t border-border">
          <p className="text-xs font-semibold text-foreground">
            {prefix}
            <span className="text-primary">{label}</span>
          </p>
        </div>
      </div>
      </Link>
      {onToggleFavorite ? (
        isFavorite ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                aria-label="Bỏ worker khỏi Yêu thích"
                aria-pressed={isFavorite}
                title="Bỏ Yêu thích"
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
                  onClick={() => onToggleFavorite(worker.id, false)}
                >
                  Xóa
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <button
            type="button"
            aria-label="Thêm worker vào Yêu thích"
            aria-pressed={isFavorite}
            title="Yêu thích"
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
}: {
  filters: AppliedFilterChip[]
  onClearAll?: () => void
}) => {
  if (!filters.length) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Đang lọc:</span>
      {filters.map((chip) => (
        <Badge key={chip.id} variant="secondary" className="gap-1 pr-1">
          <span>{chip.label}</span>
          {chip.description ? (
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  aria-label={`Xem mô tả ${chip.label}`}
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
              aria-label={`Bỏ lọc ${chip.label}`}
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
          Xoá tất cả
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
  favoriteWorkerIds,
  favoritePendingWorkerId,
  onToggleFavorite,
}: WorkersByServiceListProps) => {
  const hasActiveFilters = appliedFilters.length > 0

  if (hasFetchError) {
    return (
      <section className="container mx-auto px-4 pb-16">
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Không thể tải danh sách worker</AlertTitle>
          <AlertDescription>
            Vui lòng kiểm tra API <code>/worker/grouped-by-service</code> và thử lại.
          </AlertDescription>
        </Alert>
      </section>
    )
  }

  if (groupedServices.length === 0) {
    return (
      <section className="container mx-auto px-4 pb-16 space-y-4">
        {hasActiveFilters ? (
          <FilterChips filters={appliedFilters} onClearAll={onClearAllFilters} />
        ) : null}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {isFetching
              ? "Đang tìm kiếm..."
              : hasActiveFilters
                ? "Không có worker phù hợp"
                : "Chưa có dữ liệu"}
          </AlertTitle>
          <AlertDescription>
            {isFetching
              ? "Đang tải danh sách worker theo bộ lọc."
              : hasActiveFilters
                ? "Hãy thử bỏ bớt một vài tiêu chí, đổi khu vực hoặc xoá toàn bộ filter ở phía trên."
                : "Hiện chưa có worker nào để hiển thị."}
          </AlertDescription>
        </Alert>
      </section>
    )
  }

  return (
    <section className="container mx-auto px-4 pb-16 space-y-6">
      {hasActiveFilters ? (
        <FilterChips filters={appliedFilters} onClearAll={onClearAllFilters} />
      ) : null}
      <div
        aria-busy={isFetching}
        className={isFetching ? "space-y-12 opacity-70 transition-opacity" : "space-y-12"}
      >
        {groupedServices.map((group) => (
          <div key={group.service.id}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xl font-bold tracking-tight">
                  {workerService.getFallbackName(group.service.name)}
                </h3>
                {group.service.description &&
                serviceService.getDescription(group.service.description) ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Xem mô tả ${workerService.getFallbackName(group.service.name)}`}
                        className="cursor-pointer rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Info className="size-4" />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="flex max-h-[85vh] max-w-4xl flex-col gap-0 p-0">
                      <DialogHeader className="border-b px-6 py-4">
                        <DialogTitle>
                          {workerService.getFallbackName(group.service.name)}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="overflow-y-auto px-6 py-5">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents}
                        >
                          {serviceService.getDescription(group.service.description)!}
                        </ReactMarkdown>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : null}
              </div>
              <div className="ml-auto flex items-center gap-2 shrink-0">
                <Badge variant="outline">{group.workers.length} worker</Badge>
                <Link
                  href={`/services?category=${group.service.code}`}
                  className="inline-flex items-center justify-center rounded-full w-7 h-7 border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  aria-label={`Xem tất cả dịch vụ ${workerService.getFallbackName(group.service.name)}`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
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
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
