"use client"
import * as React from "react"
import { createPortal } from "react-dom"
import { useTranslations } from "next-intl"
import { useQuery } from "@tanstack/react-query"

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
import type { ServiceTab } from "@/lib/home/home-search-params"
import { useServicesHeaderStore } from "@/lib/store/services-header-store"
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
  activeTab: ServiceTab
  onSwitchTab: (tab: ServiceTab) => void
  activeCodes: string[]
  onToggleCode: (code: string) => void
  selectedLocation: LocationSearchResult | null
  onSelectedLocationChange: (value: LocationSearchResult | null) => void
  scheduledAt: Date | undefined
  onScheduledAtChange: (value: Date | undefined) => void
  onSearchSubmit?: () => void
}

export function HomeHero({
  activeTab,
  onSwitchTab,
  activeCodes,
  onToggleCode,
  selectedLocation,
  onSelectedLocationChange,
  scheduledAt,
  onScheduledAtChange,
  onSearchSubmit,
}: HomeHeroProps) {
  const t = useTranslations("Home")
  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services", "list"],
    queryFn: serviceService.getServices,
    staleTime: 5 * 60 * 1000,
  })

  const tabServices = React.useMemo(
    () => services.filter((s) => s.category === activeTab),
    [services, activeTab]
  )

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearchSubmit?.()
  }

  const { filterSlotEl } = useServicesHeaderStore()

  const desktopForm = (
    <div className="flex justify-center px-4 pt-2 pb-4">
      <form
        onSubmit={handleSearch}
        className={cn(
          "w-full max-w-3xl bg-background",
          "rounded-full border border-border shadow-md",
          "flex flex-row items-stretch p-2"
        )}
      >
        <ServicePickerField
          services={tabServices}
          isLoading={isLoading}
          activeCodes={activeCodes}
          onToggle={onToggleCode}
        />

        <Separator
          orientation="vertical"
          className="mx-0 h-auto self-stretch"
        />

        <LocationSearchField
          label={t("heroLocationLabel")}
          placeholder={t("heroLocationPlaceholder")}
          value={selectedLocation}
          onChange={onSelectedLocationChange}
          icon={
            <MapPin className="size-4 shrink-0 text-muted-foreground" />
          }
        />

        <Separator
          orientation="vertical"
          className="mx-0 h-auto self-stretch"
        />

        <SearchDateField
          label={t("heroTimeLabel")}
          placeholder={t("heroTimePlaceholder")}
          value={scheduledAt}
          onChange={onScheduledAtChange}
        />

        <div className="flex items-stretch">
          <Button
            type="submit"
            size="lg"
            className="h-full rounded-full px-6"
          >
            <Search className="size-4" />
            {t("heroSearchButton")}
          </Button>
        </div>
      </form>
    </div>
  )

  return (
    <>
      <div className="sm:hidden container mx-auto px-4 py-4">
        <div className="space-y-5">
          <MobileSearch
            services={tabServices}
            isLoading={isLoading}
            activeCodes={activeCodes}
            onToggleCode={onToggleCode}
            selectedLocation={selectedLocation}
            onSelectedLocationChange={onSelectedLocationChange}
            scheduledAt={scheduledAt}
            onScheduledAtChange={onScheduledAtChange}
            onSearchSubmit={onSearchSubmit}
          />
          <ServiceTabs
            activeTab={activeTab}
            onSwitchTab={onSwitchTab}
            className="justify-center"
          />
        </div>
      </div>
      {filterSlotEl ? createPortal(desktopForm, filterSlotEl) : null}
    </>
  )
}


type ServiceTabsProps = {
  activeTab: ServiceTab
  onSwitchTab: (tab: ServiceTab) => void
  className?: string
}

const SERVICE_TABS: { value: ServiceTab; labelKey: string; icon: LucideIcon }[] = [
  { value: "ASSISTANCE", labelKey: "Services.assistance", icon: Briefcase },
  { value: "COMPANIONSHIP", labelKey: "Services.companionship", icon: HeartHandshake },
]

function ServiceTabs({ activeTab, onSwitchTab, className }: ServiceTabsProps) {
  const t = useTranslations()
  const wrapRefs = React.useRef<(HTMLSpanElement | null)[]>([])

  const triggerPop = (index: number) => {
    const el = wrapRefs.current[index]
    if (!el) return
    el.classList.remove("popping")
    void el.offsetWidth
    el.classList.add("popping")
    el.addEventListener("animationend", () => el.classList.remove("popping"), { once: true })
  }

  return (
    <div className={cn("flex items-center gap-8", className)}>
      {SERVICE_TABS.map((tab, i) => {
        const isActive = activeTab === tab.value
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => { triggerPop(i); onSwitchTab(tab.value) }}
            aria-pressed={isActive}
            className={cn(
              "group flex flex-col items-center gap-1 border-b-2 pb-2 transition-colors",
              isActive
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <span
              ref={(el) => { wrapRefs.current[i] = el }}
              className="tab-icon-wrap"
            >
              <tab.icon
                aria-hidden="true"
                className="tab-icon-img size-6 select-none"
                style={{ "--tab-delay": `${i * 120}ms` } as React.CSSProperties}
              />
            </span>
            <span className="text-sm font-medium">{t(tab.labelKey)}</span>
          </button>
        )
      })}
    </div>
  )
}


type MobileSearchProps = {
  services: ServiceItem[]
  isLoading: boolean
  activeCodes: string[]
  onToggleCode: (code: string) => void
  selectedLocation: LocationSearchResult | null
  onSelectedLocationChange: (value: LocationSearchResult | null) => void
  scheduledAt: Date | undefined
  onScheduledAtChange: (value: Date | undefined) => void
  onSearchSubmit?: () => void
}

function MobileSearch({
  services,
  isLoading,
  activeCodes,
  onToggleCode,
  selectedLocation,
  onSelectedLocationChange,
  scheduledAt,
  onScheduledAtChange,
  onSearchSubmit,
}: MobileSearchProps) {
  const t = useTranslations("Home")
  const [open, setOpen] = React.useState(false)

  const handleSubmit = () => {
    setOpen(false)
    onSearchSubmit?.()
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-3 rounded-full border border-border bg-background px-5 py-3.5 text-left shadow-sm",
            "transition-shadow hover:shadow-md"
          )}
        >
          <Search className="size-5 shrink-0 text-foreground" />
          <span className="text-sm font-medium text-foreground">
            {t("heroMobileSearchTrigger")}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        sideOffset={10}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          const target = e.target as Element | null
          if (target?.closest("[data-radix-popper-content-wrapper]")) {
            e.preventDefault()
          }
        }}
        className="w-[calc(100vw-2rem)] max-w-md space-y-2 rounded-3xl p-3"
      >
        <div className="rounded-2xl border border-border">
          <LocationSearchField
            label={t("heroLocationLabel")}
            placeholder={t("heroLocationPlaceholder")}
            value={selectedLocation}
            onChange={onSelectedLocationChange}
            icon={<MapPin className="size-4 shrink-0 text-muted-foreground" />}
          />
        </div>
        <div className="rounded-2xl border border-border">
          <SearchDateField
            label={t("heroTimeLabel")}
            placeholder={t("heroTimePlaceholder")}
            value={scheduledAt}
            onChange={onScheduledAtChange}
          />
        </div>
        <div className="rounded-2xl border border-border">
          <ServicePickerField
            services={services}
            isLoading={isLoading}
            activeCodes={activeCodes}
            onToggle={onToggleCode}
          />
        </div>
        <Button
          type="button"
          size="lg"
          onClick={handleSubmit}
          className="h-12 w-full rounded-full"
        >
          <Search className="size-4" />
          {t("heroSearchButton")}
        </Button>
      </PopoverContent>
    </Popover>
  )
}

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
  const t = useTranslations("Home")
  const displayValue = React.useMemo(() => {
    if (activeCodes.length === 0) return null
    if (activeCodes.length === 1) {
      const match = services.find((s) => s.code === activeCodes[0])
      return match ? serviceService.getName(match.name) : activeCodes[0]
    }
    return t("heroServiceCount", { count: activeCodes.length })
  }, [activeCodes, services, t])

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
          <span className="text-xs font-semibold text-foreground">
            {t("heroServiceLabel")}
          </span>
          <div className="flex items-center gap-2">
            <LayoutGrid className="size-4 shrink-0 text-muted-foreground" />
            <span
              className={cn(
                "truncate text-base sm:text-sm",
                displayValue ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {displayValue ?? t("heroServicePlaceholder")}
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
              label={t("heroServiceAll")}
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
