import { api } from "@/lib/axios"
import type { PaginatedResult } from "@/services/moderation.service"

type ApiResponse<T> = {
  success: boolean
  data?: T
  message?: string
}

export type ReputationHistoryReason =
  | "booking_expiry"
  | "worker_cancel"
  | "low_review"
  | "daily_recovery"
  | "manual"

export type ReputationHistory = {
  id: string
  user_id: string
  delta: number
  previous_score: number
  new_score: number
  reason: ReputationHistoryReason
  created_at: string
}

export const reputationService = {
  listHistory: async (params: { page?: number; limit?: number }) => {
    const response = await api.get<
      ApiResponse<PaginatedResult<ReputationHistory>>
    >("/reputation/history", { params })
    return response.data.data
  },
}
