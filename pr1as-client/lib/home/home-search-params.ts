import type { LocationSearchResult } from "@/lib/vn-provinces/work-locations-api"
import type { WorkersGroupedFilters } from "@/services/worker.service"

export type HomeSearchParamRaw = string | string[] | undefined

// Top-level grouping: VIRTUAL (trợ lý ảo) vs. PHYSICAL (trợ lý thực tế).
// Drives the Airbnb-style icon tabs.
export type ServiceTab = "VIRTUAL" | "PHYSICAL"

export type HomeSearchParams = {
  category?: HomeSearchParamRaw
  province_code?: HomeSearchParamRaw
  ward_code?: HomeSearchParamRaw
  location?: HomeSearchParamRaw
  at?: HomeSearchParamRaw
  tab?: HomeSearchParamRaw
}

export type HomeSearchState = {
  activeTab: ServiceTab
  activeCodes: string[]
  selectedLocation: LocationSearchResult | null
  scheduledAt: Date | undefined
}

const toPositiveInt = (raw?: string): number | null => {
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

const firstString = (raw: HomeSearchParamRaw): string | undefined => {
  if (!raw) return undefined
  return Array.isArray(raw) ? raw[0] : raw
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const parseHomeSearchParams = (
  raw?: HomeSearchParams,
): HomeSearchState => {
  const rawCategory = raw?.category
  let activeCodes: string[] = []
  if (Array.isArray(rawCategory)) {
    activeCodes = rawCategory.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
  } else if (typeof rawCategory === "string" && rawCategory.trim()) {
    activeCodes = rawCategory.trim().split(",").map((s) => s.trim()).filter(Boolean)
  }

  const locationLabel = firstString(raw?.location) ?? ""
  const provinceCode = toPositiveInt(firstString(raw?.province_code))
  const wardCode = toPositiveInt(firstString(raw?.ward_code))

  let selectedLocation: LocationSearchResult | null = null
  if (provinceCode != null) {
    if (wardCode != null) {
      selectedLocation = {
        kind: "WARD",
        province_code: provinceCode,
        ward_code: wardCode,
        ward_name: locationLabel,
        province_short_name: "",
        label: locationLabel || "Đã chọn",
      }
    } else {
      selectedLocation = {
        kind: "PROVINCE",
        province_code: provinceCode,
        label: locationLabel || "Đã chọn",
        short_name: locationLabel || "",
      }
    }
  }

  let scheduledAt: Date | undefined
  const atRaw = firstString(raw?.at)
  if (atRaw && ISO_DATE.test(atRaw)) {
    const parsed = new Date(`${atRaw}T00:00:00`)
    if (!Number.isNaN(parsed.getTime())) scheduledAt = parsed
  }

  const rawTab = firstString(raw?.tab)
  const activeTab: ServiceTab =
    rawTab === "PHYSICAL" ? "PHYSICAL" : "VIRTUAL"

  return { activeTab, activeCodes, selectedLocation, scheduledAt }
}

export const homeStateToFilters = (
  state: HomeSearchState,
): WorkersGroupedFilters => {
  const filters: WorkersGroupedFilters = {}
  if (state.activeCodes.length > 0) {
    filters.categories = state.activeCodes
  }
  if (state.selectedLocation) {
    filters.province_code = state.selectedLocation.province_code
    if (state.selectedLocation.kind === "WARD") {
      filters.ward_code = state.selectedLocation.ward_code
    }
  }
  if (state.scheduledAt) {
    filters.schedule = state.scheduledAt.toISOString()
  }
  return filters
}

export const homeStateToQueryString = (state: HomeSearchState): string => {
  const params = new URLSearchParams()
  params.set("tab", state.activeTab)
  if (state.activeCodes.length > 0) {
    params.set("category", state.activeCodes.join(","))
  }
  if (state.selectedLocation) {
    params.set("province_code", String(state.selectedLocation.province_code))
    if (state.selectedLocation.kind === "WARD") {
      params.set("ward_code", String(state.selectedLocation.ward_code))
    }
    if (state.selectedLocation.label) {
      params.set("location", state.selectedLocation.label)
    }
  }
  if (state.scheduledAt) {
    params.set("at", state.scheduledAt.toISOString().slice(0, 10))
  }
  return params.toString()
}
