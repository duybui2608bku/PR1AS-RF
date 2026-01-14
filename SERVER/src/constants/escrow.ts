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

export const ESCROW_LIMITS = {
  AUTO_RELEASE_HOURS: 24,
  DISPUTE_WINDOW_HOURS: 48,
  MAX_HOLD_DAYS: 30,
} as const;

export const ESCROW_FEE = {
  PLATFORM_FEE_PERCENT: 10,
  WORKER_PAYOUT_PERCENT: 90,
  CANCELLATION_PENALTY_PERCENT: 20,
  FREE_CANCELLATION_HOURS: 24,
} as const;
