import { Document, Types } from "mongoose";

import {
  TransactionType,
  TransactionStatus,
  PaymentGateway,
  SePayTransferType,
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
  payment_code?: string;
  payment_content?: string;
  qr_url?: string;
  bank_account_number?: string;
  bank_name?: string;
  sepay_transaction_id?: number;
  sepay_gateway?: string;
  sepay_transaction_date?: Date;
  sepay_account_number?: string;
  sepay_code?: string | null;
  sepay_content?: string;
  sepay_transfer_type?: SePayTransferType;
  sepay_transfer_amount?: number;
  sepay_accumulated?: number;
  sepay_sub_account?: string | null;
  sepay_reference_code?: string;
  sepay_description?: string;
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
  qr_url: string;
  transaction_id: string;
  payment_code: string;
  payment_content: string;
  bank_account_number: string;
  bank_name: string;
  amount: number;
}

export interface SePayWebhookRequest {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  code: string | null;
  content: string;
  transferType: SePayTransferType;
  transferAmount: number;
  accumulated: number;
  subAccount: string | null;
  referenceCode: string;
  description: string;
}

export interface SePayWebhookResponse {
  success: true;
  status:
    | "processed"
    | "already_processed"
    | "ignored_non_incoming"
    | "ignored_missing_payment_code"
    | "ignored_transaction_not_found"
    | "amount_mismatch";
  payment_code?: string;
  transaction_id?: string;
  balance?: number;
  message?: string;
}

export interface WalletBalanceResponse {
  balance: number;
  user_id: string;
}

export interface TransactionHistoryQuery {
  type?: TransactionType;
  status?: TransactionStatus;
  start_date?: string;
  end_date?: string;
  page: number;
  limit: number;
  skip: number;
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
