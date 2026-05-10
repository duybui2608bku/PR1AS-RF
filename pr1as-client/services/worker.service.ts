import { AxiosError } from "axios"
import { cache } from "react"

import { api } from "@/lib/axios"
import type { WorkerDetail, WorkerScheduleItem } from "@/types"

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
  const response = await api.get<ApiResponse<WorkerDetail>>(`/workers/${id}`)
  if (!response.data.data) {
    throw new Error("Không tìm thấy worker")
  }
  return response.data.data
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
