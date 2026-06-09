import { api } from "@/lib/axios"

export type ReputationConfigKey =
  | "booking_expiry_deduction"
  | "worker_cancel_deduction"
  | "client_late_cancel_deduction"
  | "low_review_deduction"
  | "low_review_threshold"
  | "daily_recovery_points"
  | "warning_threshold"

/** Keys whose scoring action can be toggled on/off via the `active` flag. */
export const TOGGLEABLE_REPUTATION_KEYS: ReputationConfigKey[] = [
  "booking_expiry_deduction",
  "worker_cancel_deduction",
  "client_late_cancel_deduction",
  "low_review_deduction",
  "daily_recovery_points",
]

export interface ReputationConfig {
  _id: string
  key: ReputationConfigKey
  value: number
  active: boolean
  description: string
  updated_by: string | null
  updated_at: string
}

export interface UpdateReputationConfigInput {
  value?: number
  active?: boolean
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

  update: async (
    key: ReputationConfigKey,
    changes: UpdateReputationConfigInput
  ): Promise<ReputationConfig> => {
    const { data } = await api.patch<ApiResponse<ReputationConfig>>(
      `/admin/reputation-config/${key}`,
      changes
    )
    return data.data
  },
}
