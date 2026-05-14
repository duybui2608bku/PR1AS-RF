import { AxiosError } from "axios"
import { cache } from "react"

import { api } from "@/lib/axios"
import type { WorkerDetail, WorkerReviewItem, WorkerReviewStats, WorkerScheduleItem } from "@/types"

export type WorkersGroupedFilters = {
  q?: string
  category?: string
  province_code?: number
  ward_code?: number | null
  schedule?: string
}

const buildGroupedParams = (filters?: WorkersGroupedFilters) => {
  if (!filters) return undefined
  const params: Record<string, string | number> = {}
  if (filters.q?.trim()) params.q = filters.q.trim()
  if (filters.category && filters.category !== "ALL") params.category = filters.category
  if (typeof filters.province_code === "number") {
    params.province_code = filters.province_code
    if (typeof filters.ward_code === "number") {
      params.ward_code = filters.ward_code
    }
  }
  if (filters.schedule) params.schedule = filters.schedule
  return Object.keys(params).length ? params : undefined
}

type ApiResponse<T> = {
  success: boolean
  statusCode?: number
  message?: string
  data?: T
}

type ApiWorkerReviewStats =
  | WorkerReviewStats
  | {
      total_reviews?: number
      average_rating?: number
      rating_distribution?: Partial<Record<1 | 2 | 3 | 4 | 5 | "1" | "2" | "3" | "4" | "5", number>>
    }

type ApiWorkerDetail = Omit<WorkerDetail, "review_stats"> & {
  review_stats?: ApiWorkerReviewStats
}

const getReviewStatValue = (
  stats: ApiWorkerReviewStats | undefined,
  key: keyof WorkerReviewStats,
  apiKey: "total_reviews" | "average_rating",
): number | undefined => {
  if (!stats) return undefined
  const frontendValue = (stats as WorkerReviewStats)[key]
  if (typeof frontendValue === "number") return frontendValue
  const apiValue = (stats as Record<string, unknown>)[apiKey]
  return typeof apiValue === "number" ? apiValue : undefined
}

const getReviewDistribution = (
  stats: ApiWorkerReviewStats | undefined,
): WorkerReviewStats["distribution"] => {
  if (!stats) return undefined
  const source = stats as {
    distribution?: WorkerReviewStats["distribution"]
    rating_distribution?: WorkerReviewStats["distribution"]
  }
  return source.distribution ?? source.rating_distribution
}

const normalizeReviewStats = (
  stats: ApiWorkerReviewStats | undefined,
  reviews: WorkerReviewItem[] | undefined,
): WorkerReviewStats => {
  const fallbackTotal = reviews?.length ?? 0
  const fallbackAverage =
    fallbackTotal > 0 && reviews
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / fallbackTotal
      : 0

  return {
    total: getReviewStatValue(stats, "total", "total_reviews") ?? fallbackTotal,
    average: getReviewStatValue(stats, "average", "average_rating") ?? fallbackAverage,
    distribution: getReviewDistribution(stats),
  }
}

export type WorkerGroupedByService = {
  service: {
    id: string
    code: string
    name: {
      en?: string | null
      vi?: string | null
      zh?: string | null
      ko?: string | null
    }
    description?: {
      en?: string | null
      vi?: string | null
      zh?: string | null
      ko?: string | null
    }
    category: string
  }
  workers: Array<{
    id: string
    full_name: string | null
    avatar: string | null
    worker_profile: {
      title: string | null
      introduction: string | null
      gallery_urls: string[]
      work_locations?: Array<{
        province_code: number
        ward_code: number | null
        label_snapshot: string | null
      }>
    } | null
    pricing: Array<{
      unit: string
      duration?: number
      price: number
      currency: string
    }>
  }>
}

const getFallbackName = (name: WorkerGroupedByService["service"]["name"]) =>
  name.vi ?? name.en ?? name.zh ?? name.ko ?? "Dịch vụ"

const fetchGroupedByService = async (
  filters?: WorkersGroupedFilters,
): Promise<WorkerGroupedByService[]> => {
  const params = buildGroupedParams(filters)
  try {
    const response = await api.get<ApiResponse<WorkerGroupedByService[]>>(
      "/workers/grouped-by-service",
      { params },
    )
    return response.data.data ?? []
  } catch (error) {
    const axiosError = error as AxiosError
    if (axiosError.response?.status !== 404) {
      throw error
    }
    const fallbackResponse = await api.get<ApiResponse<WorkerGroupedByService[]>>(
      "/worker/grouped-by-service",
      { params },
    )
    return fallbackResponse.data.data ?? []
  }
}

const getWorkersGroupedByService = cache(
  (filters?: WorkersGroupedFilters): Promise<WorkerGroupedByService[]> =>
    fetchGroupedByService(filters),
)

const getWorkerById = async (id: string): Promise<WorkerDetail> => {
  const response = await api.get<ApiResponse<ApiWorkerDetail>>(`/workers/${id}`)
  if (!response.data.data) {
    throw new Error("Không tìm thấy worker")
  }
  const worker = response.data.data
  return {
    ...worker,
    review_stats: normalizeReviewStats(worker.review_stats, worker.reviews),
  }
}

const getWorkerSchedule = async (
  id: string,
  params: { start_date: string; end_date: string },
): Promise<WorkerScheduleItem[]> => {
  const response = await api.get<ApiResponse<WorkerScheduleItem[]>>(
    `/workers/${id}/schedule`,
    { params },
  )
  return response.data.data ?? []
}

export const workerService = {
  getWorkersGroupedByService,
  getWorkerById,
  getWorkerSchedule,
  getFallbackName,
}
