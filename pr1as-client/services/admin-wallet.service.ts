import { api } from "@/lib/axios"
import type { WalletTransactionStatus } from "./wallet.service"

type ApiResponse<T> = {
  success: boolean
  message?: string
  data?: T
}

export type AdminTransactionType = "deposit" | "withdraw" | "payment" | "refund" | "payout"

export interface AdminTransactionParams {
  page?: number
  limit?: number
  search?: string
  status?: WalletTransactionStatus | ""
  type?: AdminTransactionType | ""
  startDate?: string
  endDate?: string
}

export interface AdminTransactionUser {
  id: string
  email: string
  full_name?: string | null
  avatar?: string | null
}

export interface AdminTransaction {
  id: string
  user_id: string
  type: AdminTransactionType
  amount: number
  status: WalletTransactionStatus
  gateway?: string | null
  gateway_transaction_id?: string | null
  payment_code?: string | null
  payment_content?: string | null
  sepay_transaction_id?: number | null
  sepay_reference_code?: string | null
  description?: string | null
  currency: string
  created_at: string
  updated_at: string
  user?: AdminTransactionUser
}

export interface AdminTransactionListResponse {
  data: AdminTransaction[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage?: boolean
    hasPrevPage?: boolean
  }
}

export interface TransactionDailyData {
  date: string
  amount: number
  count: number
}

export interface AdminTransactionStats {
  totalAmount: number
  successAmount: number
  totalCount: number
  successCount: number
  pendingCount: number
  failedCount: number
  cancelledCount: number
  dailyData: TransactionDailyData[]
}

const emptyList: AdminTransactionListResponse = {
  data: [],
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
}

export const adminWalletService = {
  getTransactions: async (params: AdminTransactionParams = {}) => {
    const query = new URLSearchParams()
    if (params.page) query.set("page", String(params.page))
    if (params.limit) query.set("limit", String(params.limit))
    if (params.search) query.set("search", params.search)
    if (params.status) query.set("status", params.status)
    if (params.type) query.set("type", params.type)
    if (params.startDate) query.set("startDate", params.startDate)
    if (params.endDate) query.set("endDate", params.endDate)

    const { data } = await api.get<ApiResponse<AdminTransactionListResponse>>(
      `/admin/transactions?${query.toString()}`,
    )
    return data.data ?? emptyList
  },

  getStats: async (params?: { startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams()
    if (params?.startDate) query.set("startDate", params.startDate)
    if (params?.endDate) query.set("endDate", params.endDate)

    const { data } = await api.get<ApiResponse<AdminTransactionStats>>(
      `/admin/transactions/stats?${query.toString()}`,
    )
    return data.data ?? null
  },
}
