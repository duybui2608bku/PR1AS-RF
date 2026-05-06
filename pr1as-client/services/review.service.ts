import { api } from "@/lib/axios"
import type {
  CreateReviewPayload,
  Review,
  ReviewListQuery,
  ReviewListResponse,
} from "@/types/review"

type ApiResponse<T> = {
  success: boolean
  statusCode?: number
  message?: string
  data?: T
}

const emptyList: ReviewListResponse = {
  data: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  },
}

const buildParams = (query: ReviewListQuery): Record<string, string | number> => {
  const params: Record<string, string | number> = {
    page: query.page ?? 1,
    limit: query.limit ?? 20,
  }
  if (query.booking_id) params.booking_id = query.booking_id
  if (query.worker_id) params.worker_id = query.worker_id
  if (query.client_id) params.client_id = query.client_id
  if (query.review_type) params.review_type = query.review_type
  if (query.status) params.status = query.status
  return params
}

export const reviewService = {
  getMyReviews: async (query: ReviewListQuery = {}) => {
    const response = await api.get<ApiResponse<ReviewListResponse>>(
      "/reviews/my",
      { params: buildParams(query) }
    )
    return response.data.data ?? emptyList
  },

  createReview: async (payload: CreateReviewPayload) => {
    const response = await api.post<ApiResponse<Review>>("/reviews", payload)
    return response.data.data
  },
}
