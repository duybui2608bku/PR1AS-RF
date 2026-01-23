export enum EscrowStatus {
  HOLDING = "holding",
  RELEASED = "released",
  REFUNDED = "refunded",
  PARTIALLY_RELEASED = "partially_released",
  DISPUTED = "disputed",
}

export enum EscrowReleaseReason {
  BOOKING_COMPLETED = "booking_completed",
  ADMIN_RELEASE = "admin_release",
  AUTO_RELEASE = "auto_release",
}

export enum EscrowRefundReason {
  BOOKING_CANCELLED = "booking_cancelled",
  BOOKING_REJECTED = "booking_rejected",
  DISPUTE_RESOLVED = "dispute_resolved",
  ADMIN_REFUND = "admin_refund",
  WORKER_NO_SHOW = "worker_no_show",
}

export interface Escrow {
  _id: string;
  booking_id: string | {
    _id: string;
    service_code: string;
    schedule: {
      start_time: string;
      end_time: string;
    };
  };
  client_id: string | {
    _id: string;
    email: string;
    full_name: string;
  };
  worker_id: string | {
    _id: string;
    email: string;
    full_name: string;
  };
  amount: number;
  platform_fee: number;
  worker_payout: number;
  currency: string;
  status: EscrowStatus;
  hold_transaction_id: string | null;
  release_transaction_id: string | null;
  refund_transaction_id: string | null;
  held_at: string;
  released_at: string | null;
  refunded_at: string | null;
  release_reason: EscrowReleaseReason | null;
  refund_reason: EscrowRefundReason | null;
  refund_amount: number;
  penalty_amount: number;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface EscrowQuery {
  status?: EscrowStatus;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface EscrowListResponse {
  data: Escrow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
