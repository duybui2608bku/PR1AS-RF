"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useTranslations, useLocale } from "next-intl"
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
  type ServiceTab,
} from "@/lib/home/home-search-params"
import {
  useFavoriteWorkerIds,
  useToggleFavoriteWorker,
} from "@/lib/hooks/use-worker"
import { useAuthRequired } from "@/lib/hooks/use-auth-required"
import { useIsMobile } from "@/lib/hooks/use-is-mobile"
import { useServicesHeaderStore } from "@/lib/store/services-header-store"
import type { LocationSearchResult } from "@/lib/vn-provinces/work-locations-api"
import { serviceService, type ServiceItem } from "@/services/service.service"
import { workerService } from "@/services/worker.service"

type HomeSearchExperienceProps = {
  initialState: HomeSearchState
}

type DraftState = {
  selectedLocation: LocationSearchResult | null
  scheduledAt: Date | undefined
}

const draftFromState = (state: HomeSearchState): DraftState => ({
  selectedLocation: state.selectedLocation,
  scheduledAt: state.scheduledAt,
})

const findCategoryLabel = (
  code: string,
  services: ServiceItem[],
  categoryLabels: Record<string, string>,
  locale: string,
): string => {
  if (!code) return ""
  const match = services.find((s) => s.code === code)
  if (match) return serviceService.getName(match.name, locale)
  return categoryLabels[code] ?? code
}


export function HomeSearchExperience({ initialState }: HomeSearchExperienceProps) {
  const t = useTranslations()
  const locale = useLocale()
  const pathname = usePathname()
  const { requireAuth } = useAuthRequired()
  const isMobile = useIsMobile()

  const CATEGORY_LABEL: Record<string, string> = React.useMemo(
    () => ({
      COMPANIONSHIP: t("Services.companionship"),
      ASSISTANCE: t("Services.assistance"),
    }),
    [t],
  )

  const formatScheduledLabel = React.useCallback(
    (value: Date): string =>
      value.toLocaleDateString(
        locale === "vi" ? "vi-VN" : locale === "zh" ? "zh-CN" : "en-US",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        },
      ),
    [locale],
  )

  const [draft, setDraft] = React.useState<DraftState>(() =>
    draftFromState(initialState),
  )
  const [applied, setApplied] = React.useState<HomeSearchState>(initialState)
  const resultsRef = React.useRef<HTMLDivElement>(null)

  const { setActiveTab, setSearchDisplay, setSwitchTabCallback } =
    useServicesHeaderStore()

  React.useEffect(() => {
    setActiveTab(applied.activeTab)
  }, [applied.activeTab, setActiveTab])

  React.useEffect(() => {
    setSearchDisplay(
      draft.selectedLocation?.label ?? null,
      draft.scheduledAt ? formatScheduledLabel(draft.scheduledAt) : null,
    )
  }, [draft.selectedLocation, draft.scheduledAt, setSearchDisplay])

  const filters = React.useMemo(() => homeStateToFilters(applied), [applied])

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

  const visibleGroups = React.useMemo(() => {
    const groups = workersQuery.data ?? []
    return groups.filter((group) => group.service.category === applied.activeTab)
  }, [workersQuery.data, applied.activeTab])

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

  const handleSwitchTab = React.useCallback((tab: ServiceTab) => {
    setApplied((prev) =>
      prev.activeTab === tab
        ? prev
        : { ...prev, activeTab: tab, activeCodes: [] },
    )
  }, [])
  React.useEffect(() => {
    setSwitchTabCallback(handleSwitchTab)
    return () => setSwitchTabCallback(null)
  }, [handleSwitchTab, setSwitchTabCallback])

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
    setApplied((prev) => ({
      activeTab: prev.activeTab,
      activeCodes: [],
      selectedLocation: null,
      scheduledAt: undefined,
    }))
  }, [])

  const handleToggleFavorite = React.useCallback(
    (workerId: string, favorite: boolean) => {
      requireAuth(() => {
        toggleFavoriteMutation.mutate(
          { workerId, favorite },
          {
    onError: () => {
      toast.error(t("Favorites.removeError"))
    },
          },
        )
      })
    },
    [requireAuth, toggleFavoriteMutation],
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
        label: findCategoryLabel(code, services, CATEGORY_LABEL, locale),
        description: matchedService?.description
          ? serviceService.getDescription(matchedService.description, locale) ?? undefined
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
    locale,
    removeCategoryCode,
    removeLocationFilter,
    removeDateFilter,
  ])

  return (
    <>
      <HomeHero
        activeTab={applied.activeTab}
        onSwitchTab={handleSwitchTab}
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
      <div ref={resultsRef} className="pt-6">
        <WorkersByServiceList
          groupedServices={visibleGroups}
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
