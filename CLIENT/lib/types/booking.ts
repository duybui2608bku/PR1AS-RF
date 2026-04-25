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
  EXPIRED = "expired",
}

export enum BookingPaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  PARTIALLY_REFUNDED = "partially_refunded",
  REFUNDED = "refunded",
}

export enum DisputeReason {
  SERVICE_NOT_AS_DESCRIBED = "service_not_as_described",
  WORKER_NO_SHOW = "worker_no_show",
  POOR_QUALITY = "poor_quality",
  INCOMPLETE_SERVICE = "incomplete_service",
  UNPROFESSIONAL_BEHAVIOR = "unprofessional_behavior",
  SAFETY_CONCERN = "safety_concern",
  OTHER = "other",
}

export enum DisputeResolution {
  FAVOR_CLIENT = "favor_client",
  FAVOR_WORKER = "favor_worker",
  PARTIAL_REFUND = "partial_refund",
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

export interface BookingDispute {
  reason: DisputeReason;
  description: string;
  evidence_urls: string[];
  disputed_by: string;
  disputed_at: string;
  resolution: DisputeResolution | null;
  resolution_notes: string;
  resolved_by: string | null;
  resolved_at: string | null;
  refund_amount: number;
  penalty_amount: number;
}

/**
 * Input for creating a booking.
 * Note: client_id is NOT included — it's derived from the auth token on the server.
 */
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
  disputed_at: string | null;
  cancellation: {
    cancelled_at: string;
    cancelled_by: string;
    reason: string;
    notes: string;
    refund_amount: number;
    penalty_amount: number;
  } | null;
  dispute: BookingDispute | null;
  created_at: string;
  updated_at: string;
}

export interface BookingQuery {
  client_id?: string;
  worker_id?: string;
  role?: "client" | "worker";
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
