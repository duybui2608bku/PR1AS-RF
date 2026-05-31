"use client"
import * as React from "react"
import dynamic from "next/dynamic"
import { useQuery } from "@tanstack/react-query"

const DotLottieReact = dynamic(
  () => import("@lottiefiles/dotlottie-react").then((m) => m.DotLottieReact),
  {
    ssr: false,
    loading: () => (
      <div className="size-full animate-pulse rounded-2xl bg-muted/30" />
    ),
  }
)
import {
  Briefcase,
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

import { LocationSearchField } from "@/components/hero/location-search-field"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"
import { type LocationSearchResult } from "@/lib/vn-provinces/work-locations-api"
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
  activeCodes: string[]
  onToggleCode: (code: string) => void
  selectedLocation: LocationSearchResult | null
  onSelectedLocationChange: (value: LocationSearchResult | null) => void
  scheduledAt: Date | undefined
  onScheduledAtChange: (value: Date | undefined) => void
  onSearchSubmit?: () => void
}

export function HomeHero({
  activeCodes,
  onToggleCode,
  selectedLocation,
  onSelectedLocationChange,
  scheduledAt,
  onScheduledAtChange,
  onSearchSubmit,
}: HomeHeroProps) {
  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services", "list"],
    queryFn: serviceService.getServices,
    staleTime: 5 * 60 * 1000,
  })

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearchSubmit?.()
  }

  return (
    <section>
      <div className="container mx-auto px-4 py-10 sm:py-14 lg:py-24">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-10 lg:gap-8">
          <div className="lg:col-span-7">
            <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Tìm người đồng hành cho mọi khoảnh khắc
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:mt-6 sm:text-lg">
              Trợ lý cá nhân, hướng dẫn viên, người đồng hành — được tuyển chọn
              và xác minh.
            </p>
            <form
              onSubmit={handleSearch}
              className={cn(
                "mt-6 w-full max-w-3xl bg-background sm:mt-8",
                "flex flex-col divide-y divide-border rounded-2xl border border-border shadow-sm",
                "sm:flex-row sm:items-stretch sm:gap-0 sm:divide-x sm:divide-y-0 sm:divide-none sm:rounded-full sm:p-2"
              )}
            >
              <ServicePickerField
                services={services}
                isLoading={isLoading}
                activeCodes={activeCodes}
                onToggle={onToggleCode}
              />

              <Separator
                orientation="vertical"
                className="mx-0 hidden h-auto self-stretch sm:block"
              />

              <LocationSearchField
                label="Địa điểm"
                placeholder="Hà Nội hoặc Phường Cầu Giấy..."
                value={selectedLocation}
                onChange={onSelectedLocationChange}
                icon={
                  <MapPin className="size-4 shrink-0 text-muted-foreground" />
                }
              />

              <Separator
                orientation="vertical"
                className="mx-0 hidden h-auto self-stretch sm:block"
              />

              <SearchDateField
                label="Thời gian"
                placeholder="Chọn ngày và giờ"
                value={scheduledAt}
                onChange={onScheduledAtChange}
              />

              <div className="flex items-center justify-center p-2 sm:flex sm:items-stretch sm:p-0">
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 w-full rounded-xl sm:h-full sm:rounded-xl md:w-auto md:rounded-full md:px-6"
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
      </div>
    </section>
  )
}

// ─── ServicePickerField ───────────────────────────────────────────────────────

type ServicePickerFieldProps = {
  services: ServiceItem[]
  isLoading: boolean
  activeCodes: string[]
  onToggle: (code: string) => void
}

function ServicePickerField({
  services,
  isLoading,
  activeCodes,
  onToggle,
}: ServicePickerFieldProps) {
  const displayValue = React.useMemo(() => {
    if (activeCodes.length === 0) return null
    if (activeCodes.length === 1) {
      const match = services.find((s) => s.code === activeCodes[0])
      return match ? serviceService.getName(match.name) : activeCodes[0]
    }
    return `${activeCodes.length} dịch vụ`
  }, [activeCodes, services])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-h-[76px] flex-1 flex-col justify-center gap-1 px-4 py-3 text-left",
            "cursor-pointer transition-colors hover:bg-accent/50",
            "sm:min-h-0 sm:gap-0.5 sm:rounded-full sm:px-5 sm:py-2"
          )}
        >
          <span className="text-xs font-semibold text-foreground">Dịch vụ</span>
          <div className="flex items-center gap-2">
            <LayoutGrid className="size-4 shrink-0 text-muted-foreground" />
            <span
              className={cn(
                "truncate text-base sm:text-sm",
                displayValue ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {displayValue ?? "Chọn dịch vụ"}
            </span>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-64 p-2">
        {isLoading ? (
          <div className="flex flex-col gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <ServicePill
              icon={LayoutGrid}
              label="Tất cả"
              isActive={activeCodes.length === 0}
              onClick={() => onToggle("ALL")}
            />
            {services.map((service) => (
              <ServicePill
                key={service.id}
                icon={resolveIcon(service.icon)}
                label={serviceService.getName(service.name)}
                isActive={activeCodes.includes(service.code)}
                onClick={() => onToggle(service.code)}
              />
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ─── SearchDateField ──────────────────────────────────────────────────────────

type SearchDateFieldProps = {
  label: string
  placeholder: string
  value?: Date
  onChange: (value: Date | undefined) => void
  icon?: React.ReactNode
}

function SearchDateField({
  label,
  placeholder,
  value,
  onChange,
  icon,
}: SearchDateFieldProps) {
  const id = React.useId()

  return (
    <div
      className={cn(
        "flex min-h-[76px] flex-1 flex-col justify-center gap-1 px-4 py-3",
        "transition-colors hover:bg-accent/50",
        "sm:min-h-0 sm:gap-0.5 sm:rounded-full sm:px-5 sm:py-2"
      )}
    >
      <Label
        htmlFor={id}
        className="cursor-pointer text-xs font-semibold text-foreground"
      >
        {label}
      </Label>
      <div className="flex items-center gap-2">
        {icon}
        <DatePicker
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          buttonClassName="h-auto border-none bg-transparent p-0 text-base shadow-none hover:bg-transparent focus-visible:ring-0 sm:text-sm"
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

function ServicePill({
  icon: Icon,
  label,
  isActive,
  onClick,
}: ServicePillProps) {
  return (
    <Toggle
      pressed={isActive}
      onPressedChange={onClick}
      variant="outline"
      size="sm"
      className={cn(
        "h-9 w-full justify-start gap-2 rounded-full px-4 font-medium",
        "data-[state=on]:border-foreground data-[state=on]:bg-foreground data-[state=on]:text-background"
      )}
    >
      <Icon className="size-4" />
      {label}
    </Toggle>
  )
}
