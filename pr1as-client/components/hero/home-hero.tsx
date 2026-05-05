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
  ChevronLeft,
  ChevronRight,
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
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Toggle } from "@/components/ui/toggle"
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
  const [scheduledAt, setScheduledAt] = React.useState<Date>()
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
    if (scheduledAt) params.set("at", scheduledAt.toISOString().slice(0, 10))
    if (activeCode && activeCode !== "ALL") params.set("category", activeCode)
    router.push(`/services?${params.toString()}`)
  }

  return (
    <section>
      <div className="container mx-auto px-4 py-16 lg:py-24">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-10 lg:gap-8">
          <div className="lg:col-span-7">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Tìm người đồng hành cho mọi khoảnh khắc
            </h1>
            <p className="mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Trợ lý cá nhân, hướng dẫn viên, người đồng hành — được tuyển chọn và xác minh.
            </p>

            {/* Search Bar */}
            <form
              onSubmit={handleSearch}
              className={cn(
                "mt-8 w-full max-w-3xl bg-background",
                "flex flex-col divide-y divide-border rounded-2xl border border-border shadow-sm",
                "sm:flex-row sm:divide-x sm:divide-y-0 sm:items-stretch sm:rounded-full sm:p-2 sm:divide-none sm:gap-0",
              )}
            >
              <SearchField
                label="Bạn cần dịch vụ gì hôm nay?"
                placeholder="Dịch vụ hỗ trợ"
                value={serviceQuery}
                onChange={setServiceQuery}
              />

              {/* Desktop divider */}
              <Separator orientation="vertical" className="hidden sm:block self-stretch h-auto mx-0" />

              <SearchField
                label="Địa điểm"
                placeholder="Quận 1, TP.HCM"
                value={location}
                onChange={setLocation}
                icon={<MapPin className="size-4 shrink-0 text-muted-foreground" />}
              />

              <Separator orientation="vertical" className="hidden sm:block self-stretch h-auto mx-0" />

              <SearchDateField
                label="Thời gian"
                placeholder="Chọn ngày và giờ"
                value={scheduledAt}
                onChange={setScheduledAt}
              />

              <div className="p-2 sm:p-0 sm:flex sm:items-stretch">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full rounded-xl sm:w-auto sm:rounded-full sm:px-6"
                >
                  <Search className="size-4" />
                  Tìm kiếm
                </Button>
              </div>
            </form>
          </div>

          <div className="hidden lg:col-span-3 lg:block">
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

// ─── FilterPillsRow ───────────────────────────────────────────────────────────

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
    setCanLeft(el.scrollLeft > 2)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }, [])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", updateArrows, { passive: true })
    const ro = new ResizeObserver(updateArrows)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", updateArrows)
      ro.disconnect()
    }
  }, [updateArrows])

  React.useEffect(() => {
    updateArrows()
  }, [updateArrows, isLoading])

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" })
  }

  return (
    <div className="relative mt-8 flex items-center gap-2">
      {/* Arrow Left — hidden on mobile */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => scroll("left")}
        disabled={!canLeft}
        aria-label="Cuộn trái"
        className="hidden sm:inline-flex shrink-0 rounded-full"
      >
        <ChevronLeft className="size-4" />
      </Button>

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
                <Skeleton key={i} className="h-9 w-28 shrink-0 rounded-full" />
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

      {/* Arrow Right — hidden on mobile */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => scroll("right")}
        disabled={!canRight}
        aria-label="Cuộn phải"
        className="hidden sm:inline-flex shrink-0 rounded-full"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}

// ─── SearchField ──────────────────────────────────────────────────────────────

type SearchFieldProps = {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  type?: string
  icon?: React.ReactNode
}

function SearchField({ label, placeholder, value, onChange, type = "text", icon }: SearchFieldProps) {
  const id = React.useId()

  return (
    <div
      className={cn(
        "flex flex-1 flex-col justify-center px-5 py-3 gap-0.5",
        "hover:bg-accent/50 transition-colors cursor-text",
        "sm:py-2 sm:rounded-full",
      )}
    >
      <Label htmlFor={id} className="text-xs font-semibold text-foreground cursor-pointer">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        {icon}
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-auto border-none p-0 shadow-none focus-visible:ring-0 text-sm placeholder:text-muted-foreground bg-transparent"
        />
      </div>
    </div>
  )
}

type SearchDateFieldProps = {
  label: string
  placeholder: string
  value?: Date
  onChange: (value: Date | undefined) => void
  icon?: React.ReactNode
}

function SearchDateField({ label, placeholder, value, onChange, icon }: SearchDateFieldProps) {
  const id = React.useId()

  return (
    <div
      className={cn(
        "flex flex-1 flex-col justify-center px-5 py-3 gap-0.5",
        "hover:bg-accent/50 transition-colors",
        "sm:py-2 sm:rounded-full",
      )}
    >
      <Label htmlFor={id} className="text-xs font-semibold text-foreground cursor-pointer">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        {icon}
        <DatePicker
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          buttonClassName="h-auto border-none bg-transparent p-0 text-sm shadow-none hover:bg-transparent focus-visible:ring-0"
        />
      </div>
    </div>
  )
}

// ─── ServicePill ──────────────────────────────────────────────────────────────

type ServicePillProps = {
  icon: LucideIcon
  label: string
  isActive: boolean
  onClick: () => void
}

function ServicePill({ icon: Icon, label, isActive, onClick }: ServicePillProps) {
  return (
    <Toggle
      pressed={isActive}
      onPressedChange={onClick}
      variant="outline"
      size="sm"
      className={cn(
        "rounded-full px-4 h-9 gap-2 font-medium whitespace-nowrap shrink-0",
        "data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:border-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Toggle>
  )
}
