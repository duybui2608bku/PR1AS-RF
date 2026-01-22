export enum PricingUnit {
  HOURLY = "HOURLY",
  DAILY = "DAILY",
  MONTHLY = "MONTHLY",
}

export enum BookingStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  REJECTED = "rejected",
  DISPUTED = "disputed",
}

export enum BookingPaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  PARTIALLY_REFUNDED = "partially_refunded",
  REFUNDED = "refunded",
}

export interface BookingSchedule {
  start_time: string;
  end_time: string;
  duration_hours: number;
}

export interface BookingPricing {
  unit: PricingUnit;
  unit_price: number;
  quantity: number;
  subtotal: number;
  platform_fee: number;
  total_amount: number;
  worker_payout: number;
  currency: string;
}

export interface CreateBookingInput {
  worker_id: string;
  worker_service_id: string;
  service_id: string;
  service_code: string;
  schedule: BookingSchedule;
  pricing: BookingPricing;
  client_notes?: string;
}

export interface Booking {
  _id: string;
  client_id: string;
  worker_id: string;
  worker_service_id: string;
  service_id: string;
  service_code: string;
  schedule: BookingSchedule;
  pricing: BookingPricing;
  status: BookingStatus;
  payment_status: BookingPaymentStatus;
  escrow_id: string | null;
  transaction_id: string | null;
  payout_transaction_id: string | null;
  client_notes: string;
  worker_response: string;
  confirmed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancellation: {
    cancelled_at: string;
    cancelled_by: string;
    reason: string;
    notes: string;
    refund_amount: number;
    penalty_amount: number;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface BookingQuery {
  client_id?: string;
  worker_id?: string;
  status?: BookingStatus;
  payment_status?: BookingPaymentStatus;
  service_code?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface BookingListResponse {
  data: Booking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
