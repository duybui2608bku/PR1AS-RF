"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight, Globe2, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  getProvinces,
  getWardsByProvince,
  type LocationSearchResult,
  type ProvinceOption,
  type WardOption,
} from "@/lib/vn-provinces/work-locations-api"

type LocationSearchFieldProps = {
  label: string
  placeholder: string
  value: LocationSearchResult | null
  onChange: (value: LocationSearchResult | null) => void
  icon?: React.ReactNode
}

const normalizeSearchText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()

export function LocationSearchField({
  label,
  placeholder,
  value,
  onChange,
  icon,
}: LocationSearchFieldProps) {
  const t = useTranslations("Location")
  const id = React.useId()
  const [open, setOpen] = React.useState(false)
  const [provinceQuery, setProvinceQuery] = React.useState("")
  const [wardQuery, setWardQuery] = React.useState("")
  const [activeProvinceCode, setActiveProvinceCode] = React.useState<
    number | null
  >(null)

  const provincesQuery = useQuery({
    queryKey: ["vn", "provinces", "v2"],
    queryFn: getProvinces,
    staleTime: Infinity,
    enabled: open,
  })

  const wardsQuery = useQuery({
    queryKey: ["vn", "wards", "v2", activeProvinceCode],
    queryFn: () => getWardsByProvince(activeProvinceCode as number),
    enabled: open && activeProvinceCode != null,
    staleTime: Infinity,
  })

  React.useEffect(() => {
    if (provincesQuery.isError) {
      toast.error(t("loadProvinceError"))
    }
  }, [provincesQuery.isError, t])

  React.useEffect(() => {
    if (wardsQuery.isError) {
      toast.error(t("loadWardError"))
    }
  }, [wardsQuery.isError, t])

  const activeProvince = React.useMemo<ProvinceOption | null>(
    () =>
      provincesQuery.data?.find((p) => p.code === activeProvinceCode) ?? null,
    [provincesQuery.data, activeProvinceCode],
  )

  const filteredProvinces = React.useMemo(() => {
    const list = provincesQuery.data ?? []
    const q = normalizeSearchText(provinceQuery.trim())
    if (!q) return list
    return list.filter(
      (p) =>
        normalizeSearchText(p.short_name).includes(q) ||
        normalizeSearchText(p.name).includes(q),
    )
  }, [provincesQuery.data, provinceQuery])

  const filteredWards = React.useMemo(() => {
    const list = wardsQuery.data ?? []
    const q = normalizeSearchText(wardQuery.trim())
    if (!q) return list
    return list.filter((w) => normalizeSearchText(w.name).includes(q))
  }, [wardsQuery.data, wardQuery])

  const previewText = value?.label ?? ""

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      setProvinceQuery("")
      setWardQuery("")
      return
    }

    if (value) {
      setActiveProvinceCode(value.province_code)
    }
  }

  const pickProvince = (p: ProvinceOption) => {
    onChange({
      kind: "PROVINCE",
      province_code: p.code,
      label: p.name,
      short_name: p.short_name,
    })
    handleOpenChange(false)
  }

  const pickWard = (p: ProvinceOption, w: WardOption) => {
    onChange({
      kind: "WARD",
      province_code: p.code,
      ward_code: w.code,
      ward_name: w.name,
      province_short_name: p.short_name,
      label: `${w.name}, ${p.short_name}`,
    })
    handleOpenChange(false)
  }

  const handleProvinceSelect = (p: ProvinceOption) => {
    setActiveProvinceCode(p.code)
    setWardQuery("")
  }

  const handleBackToProvinces = () => {
    setActiveProvinceCode(null)
    setWardQuery("")
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setActiveProvinceCode(null)
    setProvinceQuery("")
    setWardQuery("")
  }

  return (
    <div
      className={cn(
        "flex min-h-[76px] flex-1 flex-col justify-center gap-1 px-4 py-3",
        "hover:bg-accent/50 transition-colors cursor-pointer",
        "sm:min-h-0 sm:gap-0.5 sm:px-5 sm:py-2 sm:rounded-full",
      )}
    >
      <Label
        htmlFor={id}
        className="text-xs font-semibold text-foreground cursor-pointer"
      >
        {label}
      </Label>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverAnchor asChild>
          <div
            className="flex min-w-0 items-center gap-2"
            onClick={() => handleOpenChange(true)}
          >
            {icon}
            <Input
              id={id}
              readOnly
              value={previewText}
              onClick={() => handleOpenChange(true)}
              onFocus={() => handleOpenChange(true)}
              aria-expanded={open}
              aria-haspopup="listbox"
              placeholder={placeholder}
              className="h-auto min-w-0 truncate border-none bg-transparent p-0 text-base shadow-none cursor-pointer placeholder:text-muted-foreground focus-visible:ring-0 sm:text-sm"
            />
            {value ? (
              <button
                type="button"
                onClick={handleClear}
                className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-muted sm:size-5"
                aria-label={t("clear")}
              >
                <X className="size-4 sm:size-3" />
              </button>
            ) : null}
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl p-0 sm:w-[640px] sm:rounded-md"
          align="start"
          sideOffset={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="grid max-h-[min(74vh,560px)] grid-cols-1 sm:grid-cols-2 sm:divide-x">
            <div
              className={cn(
                "min-h-0 flex-col",
                activeProvince ? "hidden sm:flex" : "flex",
              )}
            >
              <div className="border-b p-2">
                <Input
                  placeholder={t("searchProvince")}
                  value={provinceQuery}
                  onChange={(e) => setProvinceQuery(e.target.value)}
                  className="h-11 text-base sm:h-8 sm:text-sm"
                />
              </div>
              <ScrollArea className="h-[min(56vh,360px)] sm:h-72">
                <div className="p-1">
                  {provincesQuery.isLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredProvinces.length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground">
                      {t("noProvinceResults")}
                    </p>
                  ) : (
                    filteredProvinces.map((p) => (
                      <button
                        key={p.code}
                        type="button"
                        onMouseEnter={() => setActiveProvinceCode(p.code)}
                        onClick={() => handleProvinceSelect(p)}
                        className={cn(
                          "flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-base hover:bg-accent sm:min-h-0 sm:rounded-md sm:px-2 sm:py-1.5 sm:text-sm",
                          activeProvinceCode === p.code &&
                            "bg-accent font-medium",
                        )}
                      >
                        <span className="truncate">{p.short_name}</span>
                        <ChevronRight className="size-4 shrink-0 opacity-60 sm:size-3" />
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
            <div
              className={cn(
                "min-h-0 flex-col",
                activeProvince ? "flex" : "hidden sm:flex",
              )}
            >
              {activeProvince ? (
                <div className="flex items-center gap-2 border-b p-2 sm:hidden">
                  <button
                    type="button"
                    onClick={handleBackToProvinces}
                    className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-accent"
                    aria-label={t("otherProvince")}
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {activeProvince.short_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("chooseAllOrWard")}
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="border-b p-2">
                <Input
                  placeholder={
                    activeProvince
                      ? t("searchWard", { province: activeProvince.short_name })
                      : t("chooseProvinceLeft")
                  }
                  value={wardQuery}
                  onChange={(e) => setWardQuery(e.target.value)}
                  disabled={!activeProvince}
                  className="h-11 text-base sm:h-8 sm:text-sm"
                />
              </div>
              <ScrollArea className="h-[min(56vh,360px)] sm:h-72">
                {!activeProvince ? (
                  <p className="p-3 text-xs text-muted-foreground">
                    {t("chooseProvinceFirst")}
                  </p>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => pickProvince(activeProvince)}
                      className="flex min-h-12 w-full items-center justify-between gap-2 border-b px-3 py-2.5 text-base font-medium hover:bg-accent sm:min-h-0 sm:py-2 sm:text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Globe2 className="size-4" />
                        <span className="truncate">
                          {t("allProvince", {
                            province: activeProvince.name.toLowerCase(),
                          })}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t("select")}
                      </span>
                    </button>
                    <div className="p-1">
                      {wardsQuery.isLoading ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : filteredWards.length === 0 ? (
                        <p className="p-3 text-xs text-muted-foreground">
                          {t("noWardResults")}
                        </p>
                      ) : (
                        filteredWards.map((w) => (
                          <button
                            key={w.code}
                            type="button"
                            onClick={() => pickWard(activeProvince, w)}
                            className="min-h-11 w-full rounded-lg px-3 py-2.5 text-left text-base hover:bg-accent sm:min-h-0 sm:rounded-md sm:px-2 sm:py-1.5 sm:text-sm"
                          >
                            {w.name}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </ScrollArea>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
