"use client"

import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import { reputationService } from "@/services/reputation.service"

export function useReputationHistory(
  params: Parameters<typeof reputationService.listHistory>[0]
) {
  return useQuery({
    queryKey: queryKeys.reputation.history(params),
    queryFn: () => reputationService.listHistory(params),
  })
}
