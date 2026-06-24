export enum BookingStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  IN_PROGRESS = "in_progress",
  PENDING_CLIENT_ACCEPTANCE = "pending_client_acceptance",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  REJECTED = "rejected",
  DISPUTED = "disputed",
  EXPIRED = "expired",
}

export enum CancellationReason {
  CLIENT_REQUEST = "client_request",
  WORKER_UNAVAILABLE = "worker_unavailable",
  SCHEDULE_CONFLICT = "schedule_conflict",
  EMERGENCY = "emergency",
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
  phone?: string | null
}

export type BookingGuestContact = {
  name: string
  email: string
  phone?: string | null
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
  quantity: number
}

export type BookingCancellation = {
  cancelled_at: string
  cancelled_by: CancelledBy
  reason: CancellationReason
  notes: string
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
}

export type Booking = {
  _id: string
  id?: string
  client_id: string | BookingUserRef | null
  worker_id: string | BookingUserRef | null
  worker_service_id: string | BookingWorkerServiceRef | null
  service_id: string | BookingServiceRef | null
  service_code: string
  schedule: BookingSchedule
  pricing: BookingPricing
  guest_contact?: BookingGuestContact | null
  is_guest?: boolean
  public_ref?: string | null
  status: BookingStatus
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
  service_code?: string
  search?: string
  is_guest?: boolean
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

export type AdminBookingAnalyticsQuery = {
  start_date?: string
  end_date?: string
  recent_limit?: number
}

export type AdminBookingStatusCount = {
  status: BookingStatus
  count: number
  percentage: number
}

export type AdminBookingDailyCount = {
  date: string
  count: number
}

export type AdminBookingCompletionDailyCount = {
  date: string
  total: number
  completed: number
  completion_rate: number
}

export type AdminBookingAnalytics = {
  total_bookings: number
  completed_bookings: number
  completion_rate: number
  cancelled_bookings: number
  cancellation_rate: number
  disputed_bookings: number
  dispute_rate: number
  status_counts: AdminBookingStatusCount[]
  created_by_date: AdminBookingDailyCount[]
  completion_by_date: AdminBookingCompletionDailyCount[]
  recent_bookings: Booking[]
}

export type CancelBookingPayload = {
  reason: CancellationReason
  notes?: string
}

export type UpdateBookingStatusPayload = {
  status: BookingStatus
  worker_response?: string
}

export type UpdateBookingPayload = {
  worker_response?: string
}

export type CreateDisputePayload = {
  reason: DisputeReason
  description: string
  evidence_urls?: string[]
}

export type CreateBookingPayload = {
  guest_contact?: BookingGuestContact
  worker_id: string
  worker_service_id: string
  service_id: string
  service_code: string
  schedule: {
    start_time: string
    end_time: string
  }
  pricing: {
    unit: "HOURLY" | "DAILY" | "MONTHLY"
    quantity: number
  }
  client_notes?: string
}

export type CreateGuestBookingPayload = CreateBookingPayload & {
  guest_contact: BookingGuestContact
}
