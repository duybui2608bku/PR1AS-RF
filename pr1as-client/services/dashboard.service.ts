import { api } from "@/lib/axios"
import type { PricingPlanCode } from "@/services/pricing.service"

type ApiResponse<T> = {
  success: boolean
  data?: T
  message?: string
}

export type DashboardAnalyticsParams = {
  start_date?: string
  end_date?: string
}

export type DashboardDailyCount = {
  date: string
  count: number
}

export type DashboardPackageRegistrationByPlan = {
  plan_code: PricingPlanCode
  count: number
  percentage: number
}

export type DashboardPackageRegistrationByDate = {
  date: string
  standard: number
  gold: number
  diamond: number
  total: number
}

export type DashboardAnalytics = {
  total_users: number
  new_users: number
  user_registrations_by_date: DashboardDailyCount[]
  package_registrations_total: number
  package_registrations_by_plan: DashboardPackageRegistrationByPlan[]
  package_registrations_by_date: DashboardPackageRegistrationByDate[]
}

export const dashboardService = {
  getAnalytics: async (params: DashboardAnalyticsParams = {}) => {
    const query = new URLSearchParams()
    if (params.start_date) query.set("start_date", params.start_date)
    if (params.end_date) query.set("end_date", params.end_date)

    const response = await api.get<ApiResponse<DashboardAnalytics>>(
      `/admin/dashboard/analytics?${query.toString()}`
    )
    return response.data.data
  },
}
