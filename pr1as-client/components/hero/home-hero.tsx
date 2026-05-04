"use client"
import * as React from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((m) => m.DotLottieReact),
  {
    ssr: false,
    loading: () => <div className="size-full rounded-2xl bg-muted/30 animate-pulse" />,
  },
)
import {
  Briefcase,
  Calendar,
  Crown,
  HeartHandshake,
  LayoutGrid,
  Languages,
  Laptop,
  type LucideIcon,
  Map,
  MapPin,
  Search,
  User,
  UserCog,
  Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { serviceService, type ServiceItem } from "@/services/service.service"

const ICON_MAP: Record<string, LucideIcon> = {
  Crown,
  Users,
  User,
  Languages,
  Map,
  Laptop,
  Briefcase,
  UserCog,
  HeartHandshake,
}

const resolveIcon = (icon: string | null): LucideIcon => {
  if (!icon) return LayoutGrid
  return ICON_MAP[icon] ?? LayoutGrid
}

type HomeHeroProps = {
  initialServices?: ServiceItem[]
}

export function HomeHero({ initialServices }: HomeHeroProps = {}) {
  const router = useRouter()
  const [serviceQuery, setServiceQuery] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [scheduledAt, setScheduledAt] = React.useState("")
  const [activeCode, setActiveCode] = React.useState<string>("ALL")

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services", "list"],
    queryFn: serviceService.getServices,
    staleTime: 5 * 60 * 1000,
    initialData: initialServices,
  })

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const params = new URLSearchParams()
    if (serviceQuery.trim()) params.set("q", serviceQuery.trim())
    if (location.trim()) params.set("location", location.trim())
    if (scheduledAt) params.set("at", scheduledAt)
    if (activeCode && activeCode !== "ALL") params.set("category", activeCode)
    router.push(`/services?${params.toString()}`)
  }

  return (
    <section className="">
      <div className="container mx-auto px-4 py-16 lg:py-24">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-10 lg:gap-8">
          <div className="lg:col-span-7">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Tìm người đồng hành cho mọi khoảnh khắc
            </h1>
            <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Trợ lý cá nhân, hướng dẫn viên, người đồng hành — được tuyển chọn và xác minh.
            </p>

            <form
              onSubmit={handleSearch}
              className="mt-8 flex w-full max-w-3xl flex-col gap-2 rounded-full border border-border bg-background p-2 shadow-sm sm:flex-row sm:items-stretch"
            >
              <SearchField
                label="Bạn cần dịch vụ gì hôm nay?"
                placeholder="Dịch vụ hỗ trợ"
                value={serviceQuery}
                onChange={setServiceQuery}
              />
              <Divider />
              <SearchField
                label="Địa điểm"
                placeholder="Quận 1, TP.HCM"
                value={location}
                onChange={setLocation}
                icon={<MapPin className="size-4 text-muted-foreground" />}
              />
              <Divider />
              <SearchField
                label="Thời gian"
                placeholder="Chọn ngày và giờ"
                value={scheduledAt}
                onChange={setScheduledAt}
                type="datetime-local"
                icon={<Calendar className="size-4 text-muted-foreground" />}
              />
              <Button
                type="submit"
                size="lg"
                className="rounded-full px-6 sm:self-stretch"
              >
                <Search className="size-4" />
                <span>Tìm kiếm</span>
              </Button>
            </form>
          </div>

          <div className="lg:col-span-3">
            <div className="relative aspect-square w-full overflow-hidden">
            <DotLottieReact
      src="https://lottie.host/4cf55e0b-976f-48f4-a708-af69870a581c/yOVxhyHxDY.lottie"
      loop
      autoplay
    />
            </div>
          </div>
        </div>

        <FilterPillsRow
          isLoading={isLoading}
          services={services}
          activeCode={activeCode}
          onSelect={setActiveCode}
        />

      </div>
    </section>
  )
}

type FilterPillsRowProps = {
  isLoading: boolean
  services: ServiceItem[]
  activeCode: string
  onSelect: (code: string) => void
}

function FilterPillsRow({ isLoading, services, activeCode, onSelect }: FilterPillsRowProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = React.useState(false)
  const [canRight, setCanRight] = React.useState(false)

  const updateArrows = React.useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 0)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateArrows()
    el.addEventListener("scroll", updateArrows, { passive: true })
    const ro = new ResizeObserver(updateArrows)
    ro.observe(el)
    return () => { el.removeEventListener("scroll", updateArrows); ro.disconnect() }
  }, [updateArrows, isLoading])

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" })
  }

  return (
    <div className="relative mt-8 flex items-center gap-2">
      {/* Arrow Left */}
      <button
        type="button"
        onClick={() => scroll("left")}
        disabled={!canLeft}
        className={cn(
          "shrink-0 flex size-9 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-opacity",
          canLeft ? "opacity-100 hover:bg-accent" : "opacity-30 cursor-not-allowed"
        )}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
      </button>

      {/* Scrollable pills */}
      <div ref={scrollRef} className="overflow-x-auto scrollbar-none flex-1">
        <div className="flex w-max items-center gap-2 pb-1">
          <ServicePill
            icon={LayoutGrid}
            label="Tất cả"
            isActive={activeCode === "ALL"}
            onClick={() => onSelect("ALL")}
          />
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 w-32 shrink-0 animate-pulse rounded-full bg-muted" />
              ))
            : services.map((service) => (
                <ServicePill
                  key={service.id}
                  icon={resolveIcon(service.icon)}
                  label={serviceService.getName(service.name)}
                  isActive={activeCode === service.code}
                  onClick={() => onSelect(service.code)}
                />
              ))}
        </div>
      </div>

      {/* Arrow Right */}
      <button
        type="button"
        onClick={() => scroll("right")}
        disabled={!canRight}
        className={cn(
          "shrink-0 flex size-9 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-opacity",
          canRight ? "opacity-100 hover:bg-accent" : "opacity-30 cursor-not-allowed"
        )}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>
  )
}

type SearchFieldProps = {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  type?: string
  icon?: React.ReactNode
}

function SearchField({ label, placeholder, value, onChange, type = "text", icon }: SearchFieldProps) {
  return (
    <label className="flex flex-1 cursor-text flex-col justify-center rounded-full px-5 py-2 hover:bg-accent/50">
      <span className="text-xs font-semibold text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {icon}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>
    </label>
  )
}

function Divider() {
  return <span aria-hidden className="hidden w-px self-stretch bg-border sm:block" />
}

type ServicePillProps = {
  icon: LucideIcon
  label: string
  isActive: boolean
  onClick: () => void
}

function ServicePill({ icon: Icon, label, isActive, onClick }: ServicePillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        isActive
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-background text-foreground hover:bg-accent",
      )}
    >
      <Icon className="size-4" />
      <span>{label}</span>
    </button>
  )
}