import { api } from "@/lib/axios"
import { localizeServerMessage } from "@/lib/utils/error-handler"
import type { AuthUser } from "@/lib/store/auth-store"
import type {
  WorkerProfileUpdateInput,
  WorkerServiceItem,
  WorkerServiceUpsertPayload,
} from "@/types"

interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
}

export const workerProfileService = {
  updateWorkerProfile: async (
    worker_profile: WorkerProfileUpdateInput
  ): Promise<{ user: AuthUser }> => {
    const response = await api.patch<ApiResponse<{ user: AuthUser }>>(
      "/auth/profile",
      {
        worker_profile,
      }
    )
    if (!response.data.success || !response.data.data?.user) {
      throw new Error(
        localizeServerMessage(
          response.data.message,
          "Không thể cập nhật hồ sơ worker"
        )
      )
    }
    return response.data.data
  },

  becomeWorker: async (
    worker_profile: WorkerProfileUpdateInput
  ): Promise<{ user: AuthUser }> => {
    const response = await api.post<ApiResponse<{ user: AuthUser }>>(
      "/auth/become-worker",
      {
        confirm: true,
        worker_profile,
      }
    )
    if (!response.data.success || !response.data.data?.user) {
      throw new Error(
        localizeServerMessage(
          response.data.message,
          "Không thể kích hoạt vai trò worker"
        )
      )
    }
    return response.data.data
  },

  getMyWorkerServices: async (): Promise<WorkerServiceItem[]> => {
    const response =
      await api.get<ApiResponse<{ services: WorkerServiceItem[] }>>(
        "/worker/services"
      )
    return response.data.data?.services ?? []
  },

  upsertWorkerServices: async (
    payload: WorkerServiceUpsertPayload
  ): Promise<void> => {
    const body = {
      services: payload.services.map((s) => ({
        service_id: s.service_id,
        pricing: s.pricing.map((p) => ({
          unit: p.unit,
          duration: p.duration,
          price: p.price,
          currency: (p.currency ?? "VND").slice(0, 3),
        })),
      })),
    }
    const response = await api.post<ApiResponse<unknown>>(
      "/worker/services",
      body
    )
    if (!response.data.success) {
      throw new Error(
        localizeServerMessage(response.data.message, "Không thể lưu dịch vụ")
      )
    }
  },
}
