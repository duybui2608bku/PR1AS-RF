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

export type BookingRole = "client" | "worker"

export type BookingUserRef = {
  _id: string
  email?: string
  full_name?: string | null
  avatar?: string | null
}

export type LocalizedText = {
  vi: string
  en: string
  zh?: string
  ko?: string
}

export type BookingServiceRef = {
  _id: string
  code?: string
  name?: LocalizedText | string
  description?: LocalizedText | string
  icon?: string
}

export type BookingWorkerServiceRef = {
  _id: string
  title?: string
  description?: string
}

export type BookingSchedule = {
  start_time: string
  end_time: string
  duration_hours: number
}

export type BookingPricing = {
  unit: string
  unit_price: number
  quantity: number
  subtotal: number
  platform_fee: number
  total_amount: number
  worker_payout: number
  currency: string
}

export type BookingCancellation = {
  cancelled_at: string
  cancelled_by: CancelledBy
  reason: CancellationReason
  notes: string
  refund_amount: number
  penalty_amount: number
}

export type BookingDispute = {
  reason: DisputeReason
  description: string
  evidence_urls: string[]
  disputed_by: string
  disputed_at: string
  resolution: string | null
  resolution_notes: string
  resolved_by: string | null
  resolved_at: string | null
  refund_amount: number
  penalty_amount: number
}

export type Booking = {
  _id: string
  id?: string
  client_id: string | BookingUserRef
  worker_id: string | BookingUserRef
  worker_service_id: string | BookingWorkerServiceRef
  service_id: string | BookingServiceRef
  service_code: string
  schedule: BookingSchedule
  pricing: BookingPricing
  status: BookingStatus
  payment_status: BookingPaymentStatus
  escrow_id: string | null
  transaction_id: string | null
  payout_transaction_id: string | null
  client_notes: string
  worker_response: string
  confirmed_at: string | null
  started_at: string | null
  completed_at: string | null
  disputed_at: string | null
  cancellation: BookingCancellation | null
  dispute: BookingDispute | null
  created_at: string
  updated_at: string
}

export type BookingListQuery = {
  page?: number
  limit?: number
  role?: BookingRole
  status?: BookingStatus
  payment_status?: BookingPaymentStatus
  service_code?: string
  start_date?: string
  end_date?: string
}

export type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export type BookingListResponse = {
  data: Booking[]
  pagination: PaginationMeta
}

export type CancelBookingPayload = {
  reason: CancellationReason
  notes?: string
}

export type CreateDisputePayload = {
  reason: DisputeReason
  description: string
  evidence_urls?: string[]
}
