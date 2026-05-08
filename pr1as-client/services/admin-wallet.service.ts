import { api } from "@/lib/axios"
import type { WalletTransactionStatus } from "./wallet.service"

type ApiResponse<T> = {
  success: boolean
  message?: string
  data?: T
}

export type AdminTransactionType =
  | "deposit"
  | "withdraw"
  | "payment"
  | "refund"
  | "payout"
type AdminStatsDateRange =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_14_days"
  | "last_30_days"
  | "this_month"

export interface AdminTransactionParams {
  page?: number
  limit?: number
  search?: string
  status?: WalletTransactionStatus | ""
  type?: AdminTransactionType | ""
  startDate?: string
  endDate?: string
}

type RawAdminTransactionUser = AdminTransactionUser & {
  _id?: string
}

type RawAdminTransaction = Omit<AdminTransaction, "id" | "user_id" | "user"> & {
  _id?: string
  id?: string
  user_id: string | RawAdminTransactionUser
  user?: AdminTransactionUser
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

interface BackendTransactionStats {
  total_transactions: number
  deposit: { count: number; total_amount: number }
  withdraw: { count: number; total_amount: number }
  payment: { count: number; total_amount: number }
  refund: { count: number; total_amount: number }
  success: { count: number }
  pending: { count: number }
  failed: { count: number }
  cancelled: { count: number }
}

interface BackendTransactionChart {
  data: {
    date: string
    deposit: number
    withdraw: number
    payment: number
    refund: number
    total: number
  }[]
}

const emptyList: AdminTransactionListResponse = {
  data: [],
  pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
}

const getEntityId = (value?: string | { id?: string; _id?: string } | null) => {
  if (!value) return ""
  return typeof value === "string" ? value : (value.id ?? value._id ?? "")
}

const normalizeTransaction = (tx: RawAdminTransaction): AdminTransaction => {
  const populatedUser = typeof tx.user_id === "object" ? tx.user_id : undefined
  const user = tx.user ?? populatedUser

  return {
    ...tx,
    id: tx.id ?? getEntityId(tx._id),
    user_id: getEntityId(tx.user_id),
    user: user
      ? {
          id: getEntityId(user),
          email: user.email,
          full_name: user.full_name,
          avatar: user.avatar,
        }
      : undefined,
  }
}

const normalizeTransactionList = (
  response?:
    | AdminTransactionListResponse
    | {
        data: RawAdminTransaction[]
        pagination: AdminTransactionListResponse["pagination"]
      }
): AdminTransactionListResponse => {
  if (!response) return emptyList
  return {
    ...response,
    data: response.data.map((tx) =>
      normalizeTransaction(tx as RawAdminTransaction)
    ),
  }
}

const normalizeStats = (
  stats?: BackendTransactionStats,
  chart?: BackendTransactionChart
): AdminTransactionStats | null => {
  if (!stats) return null

  return {
    totalAmount:
      stats.deposit.total_amount +
      stats.withdraw.total_amount +
      stats.payment.total_amount +
      stats.refund.total_amount,
    successAmount: stats.deposit.total_amount,
    totalCount: stats.total_transactions,
    successCount: stats.success.count,
    pendingCount: stats.pending.count,
    failedCount: stats.failed.count,
    cancelledCount: stats.cancelled.count,
    dailyData:
      chart?.data.map((item) => ({
        date: item.date,
        amount: item.deposit,
        count: 0,
      })) ?? [],
  }
}

export const adminWalletService = {
  getTransactions: async (params: AdminTransactionParams = {}) => {
    const query = new URLSearchParams()
    if (params.page) query.set("page", String(params.page))
    if (params.limit) query.set("limit", String(params.limit))
    if (params.search) query.set("search", params.search)
    if (params.status) query.set("status", params.status)
    if (params.type) query.set("type", params.type)
    if (params.startDate) query.set("start_date", params.startDate)
    if (params.endDate) query.set("end_date", params.endDate)

    const { data } = await api.get<ApiResponse<AdminTransactionListResponse>>(
      `/admin/wallet/transactions?${query.toString()}`
    )
    return normalizeTransactionList(data.data)
  },

  getStats: async (params?: {
    dateRange?: AdminStatsDateRange
    startDate?: string
    endDate?: string
  }) => {
    const query = new URLSearchParams()
    query.set("date_range", params?.dateRange ?? "last_30_days")

    const [statsResponse, chartResponse] = await Promise.all([
      api.get<ApiResponse<BackendTransactionStats>>(
        `/admin/wallet/stats?${query.toString()}`
      ),
      api.get<ApiResponse<BackendTransactionChart>>(
        `/admin/wallet/chart?${query.toString()}`
      ),
    ])

    return normalizeStats(statsResponse.data.data, chartResponse.data.data)
  },
}
