"use client"

import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import { workerService } from "@/services/worker.service"

export function useWorkerDetail(id?: string) {
  return useQuery({
    queryKey: queryKeys.workers.detail(id ?? ""),
    queryFn: () => workerService.getWorkerById(id as string),
    enabled: Boolean(id),
    staleTime: 60_000,
  })
}

export function useWorkerSchedule(
  id: string | undefined,
  params: { start_date: string; end_date: string },
) {
  return useQuery({
    queryKey: queryKeys.workers.schedule(id ?? "", params),
    queryFn: () =>
      workerService.getWorkerSchedule(id as string, params),
    enabled: Boolean(id && params.start_date && params.end_date),
    staleTime: 30_000,
  })
}
