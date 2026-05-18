import { api } from "@/lib/axios"

export type ReputationConfigKey =
  | "booking_expiry_deduction"
  | "worker_cancel_deduction"
  | "low_review_deduction"
  | "low_review_threshold"
  | "daily_recovery_points"
  | "warning_threshold"

export interface ReputationConfig {
  _id: string
  key: ReputationConfigKey
  value: number
  description: string
  updated_by: string | null
  updated_at: string
}

interface ApiResponse<T> {
  data: T
  message?: string
}

export const reputationConfigService = {
  getAll: async (): Promise<ReputationConfig[]> => {
    const { data } = await api.get<ApiResponse<ReputationConfig[]>>(
      "/admin/reputation-config"
    )
    return data.data
  },

  update: async (key: ReputationConfigKey, value: number): Promise<ReputationConfig> => {
    const { data } = await api.patch<ApiResponse<ReputationConfig>>(
      `/admin/reputation-config/${key}`,
      { value }
    )
    return data.data
  },
}
