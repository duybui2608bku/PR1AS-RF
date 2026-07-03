import { api } from "@/lib/axios"

import type { PricingMeResponse } from "@/services/pricing.service"

type ApiResponse<T> = {
  success: boolean
  data?: T
  message?: string
}

export type VoucherPlanCode = "gold" | "diamond"

export type Voucher = {
  id: string
  _id?: string
  code: string
  plan_code: VoucherPlanCode
  duration_months: number
  max_uses: number
  used_count: number
  expires_at: string | null
  is_active: boolean
  note: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export type PaginatedVouchers = {
  data: Voucher[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export type ListVouchersParams = {
  page?: number
  limit?: number
  search?: string
  plan_code?: VoucherPlanCode
  is_active?: "true" | "false"
}

export type CreateVouchersInput = {
  plan_code: VoucherPlanCode
  duration_months: number
  max_uses: number
  quantity: number
  code?: string
  expires_at?: string | null
  note?: string
}

export type UpdateVoucherInput = {
  is_active?: boolean
  note?: string | null
  expires_at?: string | null
  max_uses?: number
}

export const voucherService = {
  listAdmin: async (params?: ListVouchersParams) => {
    const response = await api.get<ApiResponse<PaginatedVouchers>>(
      "/vouchers/admin",
      { params }
    )
    return response.data.data
  },

  create: async (payload: CreateVouchersInput) => {
    const response = await api.post<ApiResponse<Voucher[]>>(
      "/vouchers/admin",
      payload
    )
    return response.data.data ?? []
  },

  update: async (id: string, payload: UpdateVoucherInput) => {
    const response = await api.patch<ApiResponse<Voucher>>(
      `/vouchers/admin/${id}`,
      payload
    )
    return response.data.data
  },

  delete: async (id: string) => {
    await api.delete(`/vouchers/admin/${id}`)
  },

  redeem: async (code: string) => {
    const response = await api.post<ApiResponse<PricingMeResponse>>(
      "/vouchers/redeem",
      { code }
    )
    return response.data.data
  },
}
