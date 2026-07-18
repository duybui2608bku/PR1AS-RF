import { api } from "@/lib/axios"

export type BoostType = "basic" | "featured"
export type PointReason =
  | "attendance"
  | "attendance_streak_bonus"
  | "attendance_monthly_bonus"
  | "gold_package"
  | "diamond_package"
  | "boost_spend"
  | "admin_adjust"

export interface PointWallet {
  balance: number
  total_earned: number
  total_spent: number
  attendance_streak: number
  last_attendance_date: string | null
}

export interface PointHistoryItem {
  id: string
  delta: number
  reason: PointReason
  balance_after: number
  meta: { admin_note?: string; boost_id?: string }
  created_at: string
}

export interface AttendanceCheckInResponse {
  points_earned: number
  streak: number
  balance: number
  streak_bonus_earned: number
  monthly_bonus_earned: number
  already_checked_in: boolean
}

export interface BoostStatus {
  is_active: boolean
  boost_type: BoostType | null
  expires_at: string | null
  seconds_remaining: number | null
  boost_plan_enabled: boolean
  monthly_boost_limit: number | null
  current_month_boost_count: number
  remaining_monthly_boosts: number | null
  can_activate_boost: boolean
}

export interface ActivateBoostResponse {
  boost_type: BoostType
  expires_at: string
  points_spent: number
  balance_after: number
}

export interface BoostConfig {
  attendance_points: number
  attendance_streak_day: number
  attendance_streak_bonus: number
  attendance_monthly_bonus: number
  gold_package_points: number
  diamond_package_points: number
  basic_boost_cost: number
  basic_boost_duration_hours: number
  featured_boost_cost: number
  featured_boost_duration_hours: number
  rotation_interval_minutes: number
  updated_at: string
}

type ApiResponse<T> = { success: boolean; data?: T; message?: string }

export const boostService = {
  async checkIn(): Promise<AttendanceCheckInResponse> {
    const res = await api.post<ApiResponse<AttendanceCheckInResponse>>("/boost/attendance")
    return res.data.data!
  },

  async getPoints(limit = 20, offset = 0): Promise<{ wallet: PointWallet; history: PointHistoryItem[] }> {
    const res = await api.get<ApiResponse<{ wallet: PointWallet; history: PointHistoryItem[] }>>(
      `/boost/points?limit=${limit}&offset=${offset}`
    )
    return res.data.data!
  },

  async activateBoost(boostType: BoostType): Promise<ActivateBoostResponse> {
    const res = await api.post<ApiResponse<ActivateBoostResponse>>("/boost/activate", {
      boost_type: boostType,
    })
    return res.data.data!
  },

  async getStatus(): Promise<BoostStatus> {
    const res = await api.get<ApiResponse<BoostStatus>>("/boost/status")
    return res.data.data!
  },

  // Admin
  async getConfig(): Promise<BoostConfig> {
    const res = await api.get<ApiResponse<BoostConfig>>("/admin/boost/config")
    return res.data.data!
  },

  async updateConfig(payload: Partial<BoostConfig>): Promise<BoostConfig> {
    const res = await api.put<ApiResponse<BoostConfig>>("/admin/boost/config", payload)
    return res.data.data!
  },

  async adjustPoints(userId: string, delta: number, note: string): Promise<PointWallet> {
    const res = await api.post<ApiResponse<PointWallet>>("/admin/boost/adjust-points", {
      user_id: userId,
      delta,
      note,
    })
    return res.data.data!
  },
}
