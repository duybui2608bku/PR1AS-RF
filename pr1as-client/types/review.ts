export enum ReviewType {
  CLIENT_TO_WORKER = "client_to_worker",
  WORKER_TO_CLIENT = "worker_to_client",
}

export enum ReviewStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  HIDDEN = "hidden",
}

export const REVIEW_RATING_LIMITS = {
  MIN_RATING: 1,
  MAX_RATING: 5,
  MIN_COMMENT_LENGTH: 10,
  MAX_COMMENT_LENGTH: 1000,
} as const

export type ReviewRatingDetails = {
  professionalism: number
  punctuality: number
  communication: number
  service_quality: number
}

export type ReviewUserRef = {
  _id: string
  email?: string
  full_name?: string | null
}

export type Review = {
  _id: string
  booking_id: string | { _id: string }
  client_id: string | ReviewUserRef
  worker_id: string | ReviewUserRef
  review_type: ReviewType
  rating: number
  rating_details: ReviewRatingDetails
  comment: string
  status: ReviewStatus
  is_visible: boolean
  worker_reply: string | null
  worker_replied_at: string | null
  helpful_count: number
  reported_count: number
  created_at: string
  updated_at: string
}

export type ReviewListQuery = {
  page?: number
  limit?: number
  booking_id?: string
  worker_id?: string
  client_id?: string
  review_type?: ReviewType
  status?: ReviewStatus
}

export type ReviewListResponse = {
  data: Review[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export type CreateReviewPayload = {
  booking_id: string
  worker_id: string
  client_id: string
  review_type: ReviewType
  rating: number
  rating_details: ReviewRatingDetails
  comment: string
}
