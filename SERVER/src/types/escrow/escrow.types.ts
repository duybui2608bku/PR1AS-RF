import { Document, Types } from "mongoose";
import {
  EscrowStatus,
  EscrowReleaseReason,
  EscrowRefundReason,
} from "../../constants/escrow";

export interface IEscrow {
  booking_id: Types.ObjectId;
  client_id: Types.ObjectId;
  worker_id: Types.ObjectId;
  amount: number;
  platform_fee: number;
  worker_payout: number;
  currency: string;
  status: EscrowStatus;
  hold_transaction_id: Types.ObjectId | null;
  release_transaction_id: Types.ObjectId | null;
  refund_transaction_id: Types.ObjectId | null;
  held_at: Date;
  released_at: Date | null;
  refunded_at: Date | null;
  release_reason: EscrowReleaseReason | null;
  refund_reason: EscrowRefundReason | null;
  refund_amount: number;
  penalty_amount: number;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface IEscrowDocument extends IEscrow, Document {}

export interface CreateEscrowInput {
  booking_id: Types.ObjectId;
  client_id: Types.ObjectId;
  worker_id: Types.ObjectId;
  amount: number;
  platform_fee: number;
  worker_payout: number;
  currency: string;
  hold_transaction_id: Types.ObjectId;
}

export interface ReleaseEscrowInput {
  escrow_id: Types.ObjectId;
  release_reason: EscrowReleaseReason;
  release_transaction_id: Types.ObjectId;
}

export interface RefundEscrowInput {
  escrow_id: Types.ObjectId;
  refund_reason: EscrowRefundReason;
  refund_amount: number;
  penalty_amount: number;
  refund_transaction_id: Types.ObjectId;
}

export interface EscrowSummary {
  total_holding: number;
  total_released: number;
  total_refunded: number;
  count_holding: number;
  count_released: number;
  count_refunded: number;
}
