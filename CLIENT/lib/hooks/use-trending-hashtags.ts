"use client"

import { useQuery } from "@tanstack/react-query"
import { hashtagsApi, type GetTrendingParams } from "../api/hashtags.api"

const STALE_MS = 5 * 60 * 1000

export const useTrendingHashtags = (params?: GetTrendingParams) => {
  const window = params?.window ?? "24h"
  const limit = params?.limit ?? 10
  return useQuery({
    queryKey: ["hashtags", "trending", { window, limit }],
    queryFn: () => hashtagsApi.getTrending({ window, limit }),
    staleTime: STALE_MS,
  })
}
