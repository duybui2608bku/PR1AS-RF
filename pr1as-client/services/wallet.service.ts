import { api } from "@/lib/axios"

type ApiResponse<T> = {
  success: boolean
  statusCode?: number
  message?: string
  data?: T
}

export type WalletBalance = {
  balance: number
  user_id: string
}

export type WalletTransactionStatus = "pending" | "success" | "failed" | "cancelled"

export type WalletTransaction = {
  id: string
  user_id: string
  type: "deposit" | "withdraw" | "payment" | "refund" | "payout"
  amount: number
  status: WalletTransactionStatus
  gateway?: string | null
  gateway_transaction_id?: string | null
  payment_code?: string | null
  payment_content?: string | null
  qr_url?: string | null
  bank_account_number?: string | null
  bank_name?: string | null
  sepay_transaction_id?: number | null
  sepay_reference_code?: string | null
  description?: string | null
  currency: string
  created_at: string
  updated_at: string
}

export type WalletTransactionList = {
  data: WalletTransaction[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage?: boolean
    hasPrevPage?: boolean
  }
}

export type CreateDepositPayload = {
  amount: number
}

export type DepositPayment = {
  payment_url: string
  qr_url: string
  transaction_id: string
  payment_code: string
  payment_content: string
  bank_account_number: string
  bank_name: string
  amount: number
}

const emptyTransactionList: WalletTransactionList = {
  data: [],
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
}

export const walletService = {
  getBalance: async () => {
    const response = await api.get<ApiResponse<WalletBalance>>("/wallet/balance")
    return response.data.data ?? { balance: 0, user_id: "" }
  },

  getDepositTransactions: async (params?: { page?: number; limit?: number }) => {
    const response = await api.get<ApiResponse<WalletTransactionList>>("/wallet/transactions", {
      params: {
        type: "deposit",
        page: params?.page ?? 1,
        limit: params?.limit ?? 10,
      },
    })

    return response.data.data ?? emptyTransactionList
  },

  getTransaction: async (transactionId: string) => {
    const response = await api.get<ApiResponse<WalletTransaction>>(`/wallet/transactions/${transactionId}`)
    return response.data.data
  },

  createDeposit: async (payload: CreateDepositPayload) => {
    const response = await api.post<ApiResponse<DepositPayment>>("/wallet/deposit", payload)
    return response.data.data
  },
}
