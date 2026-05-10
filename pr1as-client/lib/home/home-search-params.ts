import type { LocationSearchResult } from "@/lib/vn-provinces/work-locations-api"
import type { WorkersGroupedFilters } from "@/services/worker.service"

export type HomeSearchParamRaw = string | string[] | undefined

export type HomeSearchParams = {
  q?: HomeSearchParamRaw
  category?: HomeSearchParamRaw
  province_code?: HomeSearchParamRaw
  ward_code?: HomeSearchParamRaw
  location?: HomeSearchParamRaw
  at?: HomeSearchParamRaw
}

export type HomeSearchState = {
  serviceQuery: string
  activeCode: string
  selectedLocation: LocationSearchResult | null
  scheduledAt: Date | undefined
}

const firstString = (raw: HomeSearchParamRaw): string | undefined => {
  if (!raw) return undefined
  return Array.isArray(raw) ? raw[0] : raw
}

const toPositiveInt = (raw?: string): number | null => {
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const parseHomeSearchParams = (
  raw?: HomeSearchParams,
): HomeSearchState => {
  const serviceQuery = firstString(raw?.q) ?? ""
  const activeCode = firstString(raw?.category) ?? "ALL"
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

  return { serviceQuery, activeCode, selectedLocation, scheduledAt }
}

export const homeStateToFilters = (
  state: HomeSearchState,
): WorkersGroupedFilters => {
  const filters: WorkersGroupedFilters = {}
  const trimmedQuery = state.serviceQuery.trim()
  if (trimmedQuery) filters.q = trimmedQuery
  if (state.activeCode && state.activeCode !== "ALL") {
    filters.category = state.activeCode
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
  const trimmedQuery = state.serviceQuery.trim()
  if (trimmedQuery) params.set("q", trimmedQuery)
  if (state.activeCode && state.activeCode !== "ALL") {
    params.set("category", state.activeCode)
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
