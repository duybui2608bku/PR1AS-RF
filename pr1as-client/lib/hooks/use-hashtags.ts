"use client"

import { useQuery } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import { hashtagService, type GetTrendingParams } from "@/services/hashtag.service"

export function useGetTrendingHashtags(params: GetTrendingParams = {}) {
  return useQuery({
    queryKey: queryKeys.hashtags.trending(params as Record<string, unknown>),
    queryFn: () => hashtagService.getTrending(params),
    staleTime: 5 * 60 * 1000,
  })
}
