import { AxiosError } from "axios"
import { cache } from "react"

import { api } from "@/lib/axios"

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

const getWorkersGroupedByService = cache(
  async (): Promise<WorkerGroupedByService[]> => {
    try {
      const response = await api.get<ApiResponse<WorkerGroupedByService[]>>(
        "/workers/grouped-by-service",
      )
      return response.data.data ?? []
    } catch (error) {
      const axiosError = error as AxiosError
      if (axiosError.response?.status !== 404) {
        throw error
      }

      const fallbackResponse = await api.get<ApiResponse<WorkerGroupedByService[]>>(
        "/worker/grouped-by-service",
      )
      return fallbackResponse.data.data ?? []
    }
  },
)

export const workerService = {
  getWorkersGroupedByService,
  getFallbackName,
}
