import { api, extractData } from "../axios/index";
import type { ApiResponse } from "../axios";
import { ApiEndpoint } from "../constants/api-endpoints";
import { TransactionType, TransactionStatus } from "../constants/wallet";

export interface CreateDepositRequest {
  amount: number;
}

export interface CreateDepositResponse {
  payment_url: string;
  transaction_id: string;
}

export interface WalletBalanceResponse {
  balance: number;
  user_id: string;
}

export interface TransactionHistoryQuery {
  type?: TransactionType;
  status?: TransactionStatus;
  page?: number;
  limit?: number;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  gateway?: string;
  gateway_transaction_id?: string;
  gateway_response?: Record<string, unknown>;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionHistoryResponse {
  data: WalletTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const walletApi = {
  createDeposit: async (
    data: CreateDepositRequest
  ): Promise<CreateDepositResponse> => {
    const response = await api.post<ApiResponse<CreateDepositResponse>>(
      ApiEndpoint.WALLET_DEPOSIT,
      data
    );
    return extractData(response);
  },

  verifyDepositCallback: async (
    queryParams: Record<string, string>
  ): Promise<void> => {
    const queryString = new URLSearchParams(queryParams).toString();
    await api.get<ApiResponse<void>>(
      `${ApiEndpoint.WALLET_DEPOSIT_CALLBACK}?${queryString}`
    );
  },

  getBalance: async (): Promise<WalletBalanceResponse> => {
    const response = await api.get<ApiResponse<WalletBalanceResponse>>(
      ApiEndpoint.WALLET_BALANCE
    );
    return extractData(response);
  },

  getTransactionHistory: async (
    query?: TransactionHistoryQuery
  ): Promise<TransactionHistoryResponse> => {
    const queryString = new URLSearchParams(
      query as Record<string, string>
    ).toString();
    const response = await api.get<ApiResponse<TransactionHistoryResponse>>(
      `${ApiEndpoint.WALLET_TRANSACTIONS}?${queryString}`
    );
    return extractData(response);
  },
};

