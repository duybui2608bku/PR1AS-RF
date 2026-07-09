"use client"

import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import { searchWorkersByHashtag } from "@/services/worker.service"

export const useWorkerHashtagSearch = (q: string, page = 1) => {
  const trimmed = q.trim()
  return useQuery({
    queryKey: queryKeys.workers.hashtagSearch(trimmed, page),
    queryFn: () => searchWorkersByHashtag(trimmed, page),
    enabled: trimmed.length > 0,
  })
}
