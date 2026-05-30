import { api } from "@/lib/axios"

type ApiResponse<T> = {
  success: boolean
  data?: T
  message?: string
}

export type FeedbackType = "bug" | "feature"
export type FeedbackStatus = "open" | "in_progress" | "resolved" | "rejected"

type FeedbackUserRef = {
  _id?: string
  id?: string
  full_name: string | null
  email: string
  avatar: string | null
}

export type Feedback = {
  id: string
  _id?: string
  user_id: FeedbackUserRef | string
  type: FeedbackType
  title: string
  description: string
  status: FeedbackStatus
  admin_note?: string | null
  resolved_by?: FeedbackUserRef | string | null
  resolved_at?: string | null
  created_at: string
  updated_at: string
}

export type PaginatedResult<T> = {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export const feedbackService = {
  createFeedback: async (payload: {
    type: FeedbackType
    title: string
    description: string
  }) => {
    const response = await api.post<ApiResponse<Feedback>>(
      "/feedback",
      payload
    )
    return response.data.data
  },

  listMyFeedback: async (params: {
    page?: number
    limit?: number
    type?: FeedbackType
    status?: FeedbackStatus
  }) => {
    const response = await api.get<ApiResponse<PaginatedResult<Feedback>>>(
      "/feedback/mine",
      { params }
    )
    return response.data.data
  },

  listFeedback: async (params: {
    page?: number
    limit?: number
    type?: FeedbackType
    status?: FeedbackStatus
  }) => {
    const response = await api.get<ApiResponse<PaginatedResult<Feedback>>>(
      "/feedback/admin",
      { params }
    )
    return response.data.data
  },

  updateStatus: async (
    id: string,
    payload: { status: FeedbackStatus; admin_note?: string | null }
  ) => {
    const response = await api.patch<ApiResponse<Feedback>>(
      `/feedback/admin/${id}/status`,
      payload
    )
    return response.data.data
  },
}
