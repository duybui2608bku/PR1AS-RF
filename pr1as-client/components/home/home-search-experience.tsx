"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"

import { HomeHero } from "@/components/hero/home-hero"
import {
  WorkersByServiceList,
  type AppliedFilterChip,
} from "@/components/worker/workers-by-service-list"
import {
  homeStateToFilters,
  homeStateToQueryString,
  type HomeSearchState,
} from "@/lib/home/home-search-params"
import type { LocationSearchResult } from "@/lib/vn-provinces/work-locations-api"
import { serviceService, type ServiceItem } from "@/services/service.service"
import {
  workerService,
  type WorkerGroupedByService,
} from "@/services/worker.service"

type HomeSearchExperienceProps = {
  initialServices: ServiceItem[]
  initialWorkers: WorkerGroupedByService[]
  hasWorkersError: boolean
  initialState: HomeSearchState
}

// "Draft" = current form values (not yet applied).
// "Applied" = the actual filter that drives URL + data fetch.
// Form fields update only the draft; clicking the search button (or
// removing a chip) writes into the applied state.
type DraftState = {
  serviceQuery: string
  selectedLocation: LocationSearchResult | null
  scheduledAt: Date | undefined
}

const draftFromState = (state: HomeSearchState): DraftState => ({
  serviceQuery: state.serviceQuery,
  selectedLocation: state.selectedLocation,
  scheduledAt: state.scheduledAt,
})

const CATEGORY_LABEL: Record<string, string> = {
  COMPANIONSHIP: "Đồng hành",
  ASSISTANCE: "Hỗ trợ",
}

const formatScheduledLabel = (value: Date): string =>
  value.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

const findCategoryLabel = (code: string, services: ServiceItem[]): string => {
  if (!code || code === "ALL") return ""
  const match = services.find((s) => s.code === code)
  if (match) return serviceService.getName(match.name)
  return CATEGORY_LABEL[code] ?? code
}

export function HomeSearchExperience({
  initialServices,
  initialWorkers,
  hasWorkersError,
  initialState,
}: HomeSearchExperienceProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [draft, setDraft] = React.useState<DraftState>(() =>
    draftFromState(initialState),
  )
  const [applied, setApplied] = React.useState<HomeSearchState>(initialState)
  const resultsRef = React.useRef<HTMLDivElement>(null)

  const filters = React.useMemo(() => homeStateToFilters(applied), [applied])
  const hasFilters = Object.keys(filters).length > 0

  // Sync applied state -> URL. Skip the first render when the URL already
  // matches the initial applied state (avoids spurious history entry).
  const isFirstSyncRef = React.useRef(true)
  React.useEffect(() => {
    const queryString = homeStateToQueryString(applied)
    if (isFirstSyncRef.current) {
      isFirstSyncRef.current = false
      const currentSearch =
        typeof window !== "undefined"
          ? window.location.search.replace(/^\?/, "")
          : ""
      if (queryString === currentSearch) return
    }
    const url = queryString ? `${pathname}?${queryString}` : pathname
    router.replace(url, { scroll: false })
  }, [applied, pathname, router])

  const workersQuery = useQuery({
    queryKey: ["workers", "grouped-by-service", filters],
    queryFn: () => workerService.getWorkersGroupedByService(filters),
    initialData: initialWorkers,
    placeholderData: (previous) => previous,
    staleTime: 30 * 1000,
  })

  const groupedServices = workersQuery.data ?? []
  const showFetchError = workersQuery.isError ? true : hasWorkersError && !hasFilters

  const handleSearchSubmit = React.useCallback(() => {
    setApplied((prev) => ({
      ...prev,
      serviceQuery: draft.serviceQuery,
      selectedLocation: draft.selectedLocation,
      scheduledAt: draft.scheduledAt,
    }))
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [draft])

  const handlePillSelect = React.useCallback((code: string) => {
    setApplied((prev) => ({ ...prev, activeCode: code }))
  }, [])

  const handleClearAllFilters = React.useCallback(() => {
    setDraft({
      serviceQuery: "",
      selectedLocation: null,
      scheduledAt: undefined,
    })
    setApplied({
      serviceQuery: "",
      activeCode: "ALL",
      selectedLocation: null,
      scheduledAt: undefined,
    })
  }, [])

  const removeQueryFilter = React.useCallback(() => {
    setDraft((prev) => ({ ...prev, serviceQuery: "" }))
    setApplied((prev) => ({ ...prev, serviceQuery: "" }))
  }, [])

  const removeCategoryFilter = React.useCallback(() => {
    setApplied((prev) => ({ ...prev, activeCode: "ALL" }))
  }, [])

  const removeLocationFilter = React.useCallback(() => {
    setDraft((prev) => ({ ...prev, selectedLocation: null }))
    setApplied((prev) => ({ ...prev, selectedLocation: null }))
  }, [])

  const removeDateFilter = React.useCallback(() => {
    setDraft((prev) => ({ ...prev, scheduledAt: undefined }))
    setApplied((prev) => ({ ...prev, scheduledAt: undefined }))
  }, [])

  const appliedFilters = React.useMemo<AppliedFilterChip[]>(() => {
    const chips: AppliedFilterChip[] = []
    const trimmedQuery = applied.serviceQuery.trim()
    if (trimmedQuery) {
      chips.push({
        id: "q",
        label: `“${trimmedQuery}”`,
        onRemove: removeQueryFilter,
      })
    }
    if (applied.activeCode && applied.activeCode !== "ALL") {
      chips.push({
        id: "category",
        label: findCategoryLabel(applied.activeCode, initialServices),
        onRemove: removeCategoryFilter,
      })
    }
    if (applied.selectedLocation) {
      chips.push({
        id: "location",
        label: applied.selectedLocation.label,
        onRemove: removeLocationFilter,
      })
    }
    if (applied.scheduledAt) {
      chips.push({
        id: "at",
        label: formatScheduledLabel(applied.scheduledAt),
        onRemove: removeDateFilter,
      })
    }
    return chips
  }, [
    applied,
    initialServices,
    removeQueryFilter,
    removeCategoryFilter,
    removeLocationFilter,
    removeDateFilter,
  ])

  return (
    <>
      <HomeHero
        initialServices={initialServices}
        serviceQuery={draft.serviceQuery}
        onServiceQueryChange={(value) =>
          setDraft((prev) => ({ ...prev, serviceQuery: value }))
        }
        activeCode={applied.activeCode}
        onActiveCodeChange={handlePillSelect}
        selectedLocation={draft.selectedLocation}
        onSelectedLocationChange={(value) =>
          setDraft((prev) => ({ ...prev, selectedLocation: value }))
        }
        scheduledAt={draft.scheduledAt}
        onScheduledAtChange={(value) =>
          setDraft((prev) => ({ ...prev, scheduledAt: value }))
        }
        onSearchSubmit={handleSearchSubmit}
      />
      <div ref={resultsRef}>
        <WorkersByServiceList
          groupedServices={groupedServices}
          hasFetchError={showFetchError}
          isFetching={workersQuery.isFetching}
          appliedFilters={appliedFilters}
          onClearAllFilters={handleClearAllFilters}
        />
      </div>
    </>
  )
}
