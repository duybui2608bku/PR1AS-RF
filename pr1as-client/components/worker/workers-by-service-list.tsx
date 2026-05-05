import Image from "next/image"
import Link from "next/link"
import { AlertCircle, ArrowRight } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { workerService, type WorkerGroupedByService } from "@/services/worker.service"

type Worker = WorkerGroupedByService["workers"][number]
type Pricing = Worker["pricing"][number]

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

const WorkerCard = ({ worker }: { worker: Worker }) => {
  const imageSrc = worker.avatar ?? worker.worker_profile?.gallery_urls?.[0] ?? null
  const { label, prefix } = formatPricing(worker.pricing)

  return (
    <div className="cursor-pointer group relative overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-md flex-none w-[44vw] sm:w-auto snap-start">
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
          <div className="absolute bottom-2 left-2 right-2">
            <Badge
              variant="secondary"
              className="bg-white/20 text-white border-0 text-[11px] backdrop-blur-sm"
            >
              {worker.worker_profile.title}
            </Badge>
          </div>
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

        <div className="flex items-center justify-between pt-1 border-t border-border">
          <p className="text-xs font-semibold text-foreground">
            {prefix}
            <span className="text-primary">{label}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

type WorkersByServiceListProps = {
  groupedServices: WorkerGroupedByService[]
  hasFetchError?: boolean
}

export const WorkersByServiceList = ({
  groupedServices,
  hasFetchError = false,
}: WorkersByServiceListProps) => {
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
      <section className="container mx-auto px-4 pb-16">
        <Alert className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Chưa có dữ liệu</AlertTitle>
          <AlertDescription>Hiện chưa có worker theo dịch vụ để hiển thị.</AlertDescription>
        </Alert>
      </section>
    )
  }

  return (
    <section className="container mx-auto px-4 pb-16">
      <div className="space-y-12">
        {groupedServices.map((group) => (
          <div key={group.service.id}>
            <div className="mb-4 flex items-center gap-3">
              <div>
                <h3 className="text-xl font-bold tracking-tight">
                  {workerService.getFallbackName(group.service.name)}
                </h3>
                {/* <p className="text-muted-foreground text-xs mt-0.5">{group.service.code}</p> */}
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
                <WorkerCard key={worker.id} worker={worker} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}