import { api, extractData } from "../axios/index";
import type { ApiResponse } from "../axios";
import { ApiEndpoint } from "../constants/api-endpoints";
import {
  TransactionType,
  TransactionStatus,
  DateRangePreset,
} from "../constants/wallet";
import { UserProfile } from "@/lib/api/auth.api";

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

export interface AdminTransactionHistoryQuery extends TransactionHistoryQuery {
  user_id?: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string | UserProfile;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  gateway?: string;
  gateway_transaction_id?: string;
  gateway_response?: Record<string, unknown>;
  description?: string;
  currency: string;
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

export interface TransactionTypeStats {
  count: number;
  total_amount: number;
}

export interface TransactionStatusStats {
  count: number;
}

export interface AdminTransactionStatsResponse {
  total_transactions: number;
  deposit: TransactionTypeStats;
  withdraw: TransactionTypeStats;
  payment: TransactionTypeStats;
  refund: TransactionTypeStats;
  success: TransactionStatusStats;
  pending: TransactionStatusStats;
  failed: TransactionStatusStats;
  cancelled: TransactionStatusStats;
}

export interface TopUserTransaction {
  user_id: string;
  full_name: string;
  email: string;
  avatar: string | null;
  transaction_count: number;
  total_amount: number;
}

export interface TopUsersResponse {
  users: TopUserTransaction[];
}

export interface ChartDataPoint {
  date: string;
  deposit: number;
  withdraw: number;
  payment: number;
  refund: number;
  total: number;
}

export interface TransactionChartResponse {
  data: ChartDataPoint[];
}

export interface DateRangeQuery {
  date_range: DateRangePreset;
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

  getAdminTransactionHistory: async (
    query?: AdminTransactionHistoryQuery
  ): Promise<TransactionHistoryResponse> => {
    const cleanQuery: Record<string, string> = {};
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          cleanQuery[key] = String(value);
        }
      });
    }
    const queryString = new URLSearchParams(cleanQuery).toString();
    const response = await api.get<ApiResponse<TransactionHistoryResponse>>(
      `${ApiEndpoint.ADMIN_WALLET_TRANSACTIONS}${
        queryString ? `?${queryString}` : ""
      }`
    );
    return extractData(response);
  },

  getTransactionStats: async (
    query: DateRangeQuery
  ): Promise<AdminTransactionStatsResponse> => {
    const response = await api.get<ApiResponse<AdminTransactionStatsResponse>>(
      `${ApiEndpoint.ADMIN_WALLET_STATS}?date_range=${query.date_range}`
    );
    return extractData(response);
  },

  getTopUsers: async (query: DateRangeQuery): Promise<TopUsersResponse> => {
    const response = await api.get<ApiResponse<TopUsersResponse>>(
      `${ApiEndpoint.ADMIN_WALLET_TOP_USERS}?date_range=${query.date_range}`
    );
    return extractData(response);
  },

  getTransactionChartData: async (
    query: DateRangeQuery
  ): Promise<TransactionChartResponse> => {
    const response = await api.get<ApiResponse<TransactionChartResponse>>(
      `${ApiEndpoint.ADMIN_WALLET_CHART}?date_range=${query.date_range}`
    );
    return extractData(response);
  },
};
