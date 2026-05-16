"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

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
import {
  useFavoriteWorkerIds,
  useToggleFavoriteWorker,
} from "@/lib/hooks/use-worker"
import { useAuthStore } from "@/lib/store/auth-store"
import type { LocationSearchResult } from "@/lib/vn-provinces/work-locations-api"
import { serviceService, type ServiceItem } from "@/services/service.service"
import { workerService } from "@/services/worker.service"

type HomeSearchExperienceProps = {
  initialState: HomeSearchState
}

// "Draft" = current form values (not yet applied).
// "Applied" = the actual filter that drives URL + data fetch.
// Form fields update only the draft; clicking the search button (or
// removing a chip) writes into the applied state.
type DraftState = {
  selectedLocation: LocationSearchResult | null
  scheduledAt: Date | undefined
}

const draftFromState = (state: HomeSearchState): DraftState => ({
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
  if (!code) return ""
  const match = services.find((s) => s.code === code)
  if (match) return serviceService.getName(match.name)
  return CATEGORY_LABEL[code] ?? code
}


export function HomeSearchExperience({ initialState }: HomeSearchExperienceProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const [draft, setDraft] = React.useState<DraftState>(() =>
    draftFromState(initialState),
  )
  const [applied, setApplied] = React.useState<HomeSearchState>(initialState)
  const resultsRef = React.useRef<HTMLDivElement>(null)

  const filters = React.useMemo(() => homeStateToFilters(applied), [applied])

  // Sync applied state -> URL without triggering RSC navigation.
  const isFirstSyncRef = React.useRef(true)
  React.useEffect(() => {
    const queryString = homeStateToQueryString(applied)
    if (isFirstSyncRef.current) {
      isFirstSyncRef.current = false
      if (queryString === window.location.search.replace(/^\?/, "")) return
    }
    const url = queryString ? `${pathname}?${queryString}` : pathname
    window.history.replaceState(null, "", url)
  }, [applied, pathname])

  const { data: services = [] } = useQuery({
    queryKey: ["services", "list"],
    queryFn: serviceService.getServices,
    staleTime: 5 * 60 * 1000,
  })

  const workersQuery = useQuery({
    queryKey: ["workers", "grouped-by-service", filters],
    queryFn: () => workerService.getWorkersGroupedByService(filters),
    placeholderData: (previous) => previous,
    staleTime: 30 * 1000,
  })

  const groupedServices = workersQuery.data ?? []
  const showFetchError = workersQuery.isError
  const favoriteIdsQuery = useFavoriteWorkerIds()
  const toggleFavoriteMutation = useToggleFavoriteWorker()
  const favoriteWorkerIds = React.useMemo(
    () => new Set(favoriteIdsQuery.data ?? []),
    [favoriteIdsQuery.data],
  )

  const handleSearchSubmit = React.useCallback(() => {
    setApplied((prev) => ({
      ...prev,
      selectedLocation: draft.selectedLocation,
      scheduledAt: draft.scheduledAt,
    }))
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [draft])

  const handleToggleCode = React.useCallback((code: string) => {
    setApplied((prev) => {
      if (code === "ALL") return { ...prev, activeCodes: [] }
      const already = prev.activeCodes.includes(code)
      return {
        ...prev,
        activeCodes: already
          ? prev.activeCodes.filter((c) => c !== code)
          : [...prev.activeCodes, code],
      }
    })
  }, [])

  const handleClearAllFilters = React.useCallback(() => {
    setDraft({ selectedLocation: null, scheduledAt: undefined })
    setApplied({ activeCodes: [], selectedLocation: null, scheduledAt: undefined })
  }, [])

  const handleToggleFavorite = React.useCallback(
    (workerId: string, favorite: boolean) => {
      if (!isAuthenticated) {
        toast.info("Vui lòng đăng nhập để lưu worker yêu thích.")
        router.push(`/login?from=${encodeURIComponent(pathname)}`)
        return
      }

      toggleFavoriteMutation.mutate(
        { workerId, favorite },
        {
          onError: () => {
            toast.error("Không thể cập nhật danh sách yêu thích.")
          },
        },
      )
    },
    [isAuthenticated, pathname, router, toggleFavoriteMutation],
  )

  const removeCategoryCode = React.useCallback((code: string) => {
    setApplied((prev) => ({
      ...prev,
      activeCodes: prev.activeCodes.filter((c) => c !== code),
    }))
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
    for (const code of applied.activeCodes) {
      const matchedService = services.find((s) => s.code === code)
      chips.push({
        id: `category-${code}`,
        label: findCategoryLabel(code, services),
        description: matchedService?.description
          ? serviceService.getDescription(matchedService.description) ?? undefined
          : undefined,
        onRemove: () => removeCategoryCode(code),
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
    services,
    removeCategoryCode,
    removeLocationFilter,
    removeDateFilter,
  ])

  return (
    <>
      <HomeHero
        activeCodes={applied.activeCodes}
        onToggleCode={handleToggleCode}
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
          favoriteWorkerIds={favoriteWorkerIds}
          favoritePendingWorkerId={
            toggleFavoriteMutation.isPending
              ? toggleFavoriteMutation.variables?.workerId
              : null
          }
          onToggleFavorite={handleToggleFavorite}
        />
      </div>
    </>
  )
}
