import { cache } from "react"

import { api } from "@/lib/axios"

interface ApiResponse<T> {
  success: boolean
  statusCode?: number
  data?: T
  message?: string
}

export type PricingPlanCode = "standard" | "gold" | "diamond"

export type PricingPlanFeatures = {
  messaging_enabled: boolean
  messaging_max_recipients: number | null
  create_job_enabled: boolean
  create_job_limit: number | null
  boost_profile_enabled: boolean
  boost_profile_monthly_limit: number | null
  ads_enabled: boolean
}

export type PricingPackage = {
  _id: string
  package_code: PricingPlanCode
  display_name: string
  is_active: boolean
  features: PricingPlanFeatures
  created_at: string
  updated_at: string
}

export type PricingMeResponse = {
  plan_code: PricingPlanCode
  started_at: string | null
  expires_at: string | null
  is_expired: boolean
  package: PricingPackage
}

export type UpgradePricingPayload = {
  target_plan_code: Exclude<PricingPlanCode, "standard">
  duration_months?: number
  idempotency_key?: string
}

const getPublicPackages = cache(async () => {
  const response = await api.get<ApiResponse<PricingPackage[]>>("/pricing/packages")
  return response.data.data ?? []
})

const getMyPricing = async () => {
  const response = await api.get<ApiResponse<PricingMeResponse>>("/pricing/me")
  return response.data.data
}

const upgrade = async (payload: UpgradePricingPayload) => {
  const response = await api.post<ApiResponse<PricingMeResponse>>(
    "/pricing/upgrade",
    {
      duration_months: 1,
      ...payload,
    }
  )
  return response.data.data
}

export const pricingService = {
  getPublicPackages,
  getMyPricing,
  upgrade,
}
