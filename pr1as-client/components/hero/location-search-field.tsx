"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronRight, Globe2, Loader2, X } from "lucide-react"
import { toast } from "sonner"

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

export function LocationSearchField({
  label,
  placeholder,
  value,
  onChange,
  icon,
}: LocationSearchFieldProps) {
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
      toast.error("Không tải được danh sách tỉnh/thành.")
    }
  }, [provincesQuery.isError])

  React.useEffect(() => {
    if (wardsQuery.isError) {
      toast.error("Không tải được danh sách phường/xã.")
    }
  }, [wardsQuery.isError])

  React.useEffect(() => {
    if (!open) {
      setProvinceQuery("")
      setWardQuery("")
    } else if (value && activeProvinceCode == null) {
      setActiveProvinceCode(value.province_code)
    }
  }, [open, value, activeProvinceCode])

  const activeProvince = React.useMemo<ProvinceOption | null>(
    () =>
      provincesQuery.data?.find((p) => p.code === activeProvinceCode) ?? null,
    [provincesQuery.data, activeProvinceCode],
  )

  const filteredProvinces = React.useMemo(() => {
    const list = provincesQuery.data ?? []
    const q = provinceQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (p) =>
        p.short_name.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q),
    )
  }, [provincesQuery.data, provinceQuery])

  const filteredWards = React.useMemo(() => {
    const list = wardsQuery.data ?? []
    const q = wardQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter((w) => w.name.toLowerCase().includes(q))
  }, [wardsQuery.data, wardQuery])

  const pickProvince = (p: ProvinceOption) => {
    onChange({
      kind: "PROVINCE",
      province_code: p.code,
      label: p.name,
      short_name: p.short_name,
    })
    setOpen(false)
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
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  return (
    <div
      className={cn(
        "flex flex-1 flex-col justify-center px-5 py-3 gap-0.5",
        "hover:bg-accent/50 transition-colors cursor-pointer",
        "sm:py-2 sm:rounded-full",
      )}
    >
      <Label
        htmlFor={id}
        className="text-xs font-semibold text-foreground cursor-pointer"
      >
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="flex items-center gap-2">
            {icon}
            <Input
              id={id}
              readOnly
              value={value?.label ?? ""}
              onClick={() => setOpen(true)}
              placeholder={placeholder}
              className="h-auto border-none p-0 shadow-none focus-visible:ring-0 text-sm placeholder:text-muted-foreground bg-transparent cursor-pointer"
            />
            {value ? (
              <button
                type="button"
                onClick={handleClear}
                className="rounded-full p-0.5 hover:bg-muted"
                aria-label="Xóa"
              >
                <X className="size-3" />
              </button>
            ) : null}
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="w-[640px] max-w-[calc(100vw-2rem)] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="grid grid-cols-2 divide-x">
            <div className="flex flex-col">
              <div className="border-b p-2">
                <Input
                  placeholder="Tìm tỉnh / thành phố..."
                  value={provinceQuery}
                  onChange={(e) => setProvinceQuery(e.target.value)}
                  className="h-8"
                />
              </div>
              <ScrollArea className="h-72">
                <div className="p-1">
                  {provincesQuery.isLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredProvinces.length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground">
                      Không có kết quả.
                    </p>
                  ) : (
                    filteredProvinces.map((p) => (
                      <button
                        key={p.code}
                        type="button"
                        onMouseEnter={() => setActiveProvinceCode(p.code)}
                        onClick={() => setActiveProvinceCode(p.code)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                          activeProvinceCode === p.code &&
                            "bg-accent font-medium",
                        )}
                      >
                        <span className="truncate">{p.short_name}</span>
                        <ChevronRight className="size-3 shrink-0 opacity-60" />
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
            <div className="flex flex-col">
              <div className="border-b p-2">
                <Input
                  placeholder={
                    activeProvince
                      ? `Tìm phường/xã ở ${activeProvince.short_name}...`
                      : "Chọn tỉnh bên trái"
                  }
                  value={wardQuery}
                  onChange={(e) => setWardQuery(e.target.value)}
                  disabled={!activeProvince}
                  className="h-8"
                />
              </div>
              <ScrollArea className="h-72">
                {!activeProvince ? (
                  <p className="p-3 text-xs text-muted-foreground">
                    Chọn tỉnh để xem phường/xã.
                  </p>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => pickProvince(activeProvince)}
                      className="flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-sm font-medium hover:bg-accent"
                    >
                      <span className="flex items-center gap-2">
                        <Globe2 className="size-4" />
                        Toàn {activeProvince.name.toLowerCase()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Chọn
                      </span>
                    </button>
                    <div className="p-1">
                      {wardsQuery.isLoading ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : filteredWards.length === 0 ? (
                        <p className="p-3 text-xs text-muted-foreground">
                          Không có phường/xã phù hợp.
                        </p>
                      ) : (
                        filteredWards.map((w) => (
                          <button
                            key={w.code}
                            type="button"
                            onClick={() => pickWard(activeProvince, w)}
                            className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
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
