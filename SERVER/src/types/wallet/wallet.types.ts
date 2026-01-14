import { Document, Types } from "mongoose";

import {
  TransactionType,
  TransactionStatus,
  PaymentGateway,
} from "../../constants/wallet";

export interface IWallet {
  user_id: Types.ObjectId;
  balance: number;
  currency: string;
  updated_at: Date;
}

export interface IWalletDocument extends IWallet, Document {}

export interface IWalletTransaction {
  user_id: Types.ObjectId;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  gateway?: PaymentGateway;
  gateway_transaction_id?: string;
  gateway_response?: Record<string, unknown>;
  description?: string;
  currency: string;
  created_at: Date;
  updated_at: Date;
}

export interface IWalletTransactionDocument
  extends IWalletTransaction, Document {}

export interface CreateDepositRequest {
  amount: number;
}

export interface CreateDepositResponse {
  payment_url: string;

  transaction_id: string;
}

export interface VerifyPaymentRequest {
  vnp_TxnRef: string;
  vnp_ResponseCode: string;
  vnp_TransactionStatus?: string;
  vnp_SecureHash: string;
  [key: string]: string | undefined;
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
  user_id?: string;
}

export interface TransactionHistoryResponse {
  transactions: IWalletTransactionDocument[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminTransactionHistoryQuery extends TransactionHistoryQuery {
  user_id?: string;
}

export interface AdminTransactionStatsQuery {
  date_range: string;
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
