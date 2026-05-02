"use client"

import { api, extractData } from "../axios/index"
import type { ApiResponse } from "../axios"
import { ApiEndpoint } from "../constants/api-endpoints"
import type { TrendingHashtagsResponse } from "../types/post"

export type TrendingWindow = "24h" | "7d"

export interface GetTrendingParams {
  window?: TrendingWindow
  limit?: number
}

export const hashtagsApi = {
  getTrending: async (
    params?: GetTrendingParams
  ): Promise<TrendingHashtagsResponse> => {
    const response = await api.get<ApiResponse<TrendingHashtagsResponse>>(
      ApiEndpoint.HASHTAGS_TRENDING,
      {
        params: {
          window: params?.window ?? "24h",
          limit: params?.limit ?? 10,
        },
      }
    )
    return extractData(response)
  },
}
