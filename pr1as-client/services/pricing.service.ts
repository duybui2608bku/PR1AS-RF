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

const getPublicPackages = cache(async () => {
  const response = await api.get<ApiResponse<PricingPackage[]>>("/pricing/packages")
  return response.data.data ?? []
})

export const pricingService = {
  getPublicPackages,
}
