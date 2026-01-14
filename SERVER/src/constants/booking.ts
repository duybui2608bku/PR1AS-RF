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

export enum CancellationReason {
  CLIENT_REQUEST = "client_request",
  WORKER_UNAVAILABLE = "worker_unavailable",
  SCHEDULE_CONFLICT = "schedule_conflict",
  EMERGENCY = "emergency",
  PAYMENT_FAILED = "payment_failed",
  POLICY_VIOLATION = "policy_violation",
  OTHER = "other",
}

export enum CancelledBy {
  CLIENT = "client",
  WORKER = "worker",
  ADMIN = "admin",
  SYSTEM = "system",
}

export const BOOKING_LIMITS = {
  MIN_ADVANCE_HOURS: 2,
  MAX_ADVANCE_DAYS: 30,
  CANCELLATION_FREE_HOURS: 24,
  CANCELLATION_PENALTY_PERCENT: 20,
  MAX_DURATION_HOURS: 24,
  MIN_DURATION_HOURS: 1,
  AUTO_CONFIRM_HOURS: 24,
  AUTO_COMPLETE_HOURS: 2,
} as const;

export const BOOKING_FEE = {
  PLATFORM_FEE_PERCENT: 2,
  WORKER_PAYOUT_PERCENT: 98,
} as const;
