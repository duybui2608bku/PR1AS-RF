import { api } from "@/lib/axios"
import type { ApiResponse, TrendingHashtag } from "@/types"

export type GetTrendingParams = {
  window?: "24h" | "7d"
  limit?: number
}

export const hashtagService = {
  getTrending: async (params: GetTrendingParams = {}) => {
    const query = new URLSearchParams()
    if (params.window) query.set("window", params.window)
    if (params.limit) query.set("limit", String(params.limit))

    const { data } = await api.get<ApiResponse<TrendingHashtag[]>>(
      `/hashtags/trending?${query.toString()}`,
    )
    return data.data
  },
}
