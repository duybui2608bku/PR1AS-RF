"use client"

import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import {
  dashboardService,
  type DashboardAnalyticsParams,
} from "@/services/dashboard.service"

export function useDashboardAnalytics(params: DashboardAnalyticsParams) {
  return useQuery({
    queryKey: queryKeys.dashboard.analytics(params as Record<string, unknown>),
    queryFn: () => dashboardService.getAnalytics(params),
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  })
}
