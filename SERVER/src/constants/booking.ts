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


export const BOOKING_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.PENDING]: [
    BookingStatus.CONFIRMED,
    BookingStatus.REJECTED,
    BookingStatus.CANCELLED,
    BookingStatus.EXPIRED,
  ],
  [BookingStatus.CONFIRMED]: [
    BookingStatus.IN_PROGRESS,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.IN_PROGRESS]: [
    BookingStatus.COMPLETED,
    BookingStatus.CANCELLED,
    BookingStatus.DISPUTED,
  ],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.REJECTED]: [],
  [BookingStatus.DISPUTED]: [
    BookingStatus.COMPLETED,
    BookingStatus.CANCELLED,
  ],
  [BookingStatus.EXPIRED]: [],
};

export const BOOKING_LIMITS = {
  MIN_ADVANCE_HOURS: 2,
  MAX_ADVANCE_DAYS: 30,
  CANCELLATION_FREE_HOURS: 24,
  CANCELLATION_PENALTY_PERCENT: 20,
  MAX_DURATION_HOURS: 24,
  MIN_DURATION_HOURS: 1,
  MAX_DURATION_DAYS: 30,
  MAX_DURATION_MONTHS: 12,
  AUTO_CONFIRM_HOURS: 24,
  AUTO_COMPLETE_HOURS: 2,
} as const;
