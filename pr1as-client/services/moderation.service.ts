import { api } from "@/lib/axios"

type ApiResponse<T> = {
  success: boolean
  data?: T
  message?: string
}

export type ReportReason =
  | "scam"
  | "low_quality"
  | "harassment"
  | "fake_profile"
  | "other"

export type ReportStatus = "open" | "reviewing" | "resolved" | "rejected"
export type ReportTargetType = "post" | "worker"
export type RestrictionFeature = "post_create" | "worker_activity"
export type RestrictionStatus = "active" | "revoked" | "expired"

export type ReportRestrictionRef = {
  _id?: string
  id?: string
  status: RestrictionStatus
  starts_at?: string | null
  ends_at?: string | null
}

export type UserBlock = {
  id: string
  blocked_id:
    | string
    | {
        _id: string
        full_name: string | null
        email: string
        avatar: string | null
      }
  block_profile: boolean
  reason: string | null
  created_at: string
  updated_at: string
}

export type ModerationReport = {
  id: string
  _id?: string
  reporter_id: {
    _id: string
    full_name: string | null
    email: string
    avatar: string | null
  }
  target_type: ReportTargetType
  reason: ReportReason
  description: string
  post_id?: unknown
  worker_id?: string | null
  target_user_id?: {
    _id: string
    full_name: string | null
    email: string
    avatar: string | null
  }
  booking_id?: string | null
  evidence_urls?: string[]
  status: ReportStatus
  admin_note?: string | null
  post_deleted_at?: string | null
  post_create_restriction_id?: ReportRestrictionRef | string | null
  worker_activity_restriction_id?: ReportRestrictionRef | string | null
  created_at: string
  updated_at: string
}

export type UserRestriction = {
  id: string
  _id?: string
  user_id: unknown
  feature: RestrictionFeature
  reason: string
  starts_at: string
  ends_at: string | null
  status: RestrictionStatus
  created_at: string
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

export const moderationService = {
  listBlocks: async () => {
    const response = await api.get<ApiResponse<UserBlock[]>>(
      "/moderation/blocks"
    )
    return response.data.data ?? []
  },

  blockUser: async (payload: {
    blocked_user_id: string
    block_profile: boolean
    reason?: string | null
  }) => {
    const response = await api.post<ApiResponse<UserBlock>>(
      "/moderation/blocks",
      payload
    )
    return response.data.data
  },

  unblockUser: async (blockedUserId: string) => {
    const response = await api.delete<
      ApiResponse<{ blocked_user_id: string; blocked: false }>
    >(`/moderation/blocks/${blockedUserId}`)
    return response.data.data
  },

  reportPost: async (payload: {
    post_id: string
    reason: ReportReason
    description: string
  }) => {
    const response = await api.post<ApiResponse<ModerationReport>>(
      "/moderation/reports/post",
      payload
    )
    return response.data.data
  },

  getOpenPostReport: async (postId: string) => {
    const response = await api.get<ApiResponse<ModerationReport | null>>(
      `/moderation/reports/post/${postId}/open`
    )
    return response.data.data ?? null
  },

  reportWorker: async (payload: {
    worker_id: string
    reason: ReportReason
    description: string
    booking_id?: string
    evidence_urls?: string[]
  }) => {
    const response = await api.post<ApiResponse<ModerationReport>>(
      "/moderation/reports/worker",
      payload
    )
    return response.data.data
  },

  getOpenWorkerReport: async (workerId: string) => {
    const response = await api.get<ApiResponse<ModerationReport | null>>(
      `/moderation/reports/worker/${workerId}/open`
    )
    return response.data.data ?? null
  },

  listReports: async (params: {
    page?: number
    limit?: number
    target_type?: ReportTargetType
    status?: ReportStatus
    start_date?: string
    end_date?: string
  }) => {
    const response = await api.get<ApiResponse<PaginatedResult<ModerationReport>>>(
      "/moderation/admin/reports",
      { params }
    )
    return response.data.data
  },

  listMyReports: async (params: {
    page?: number
    limit?: number
    target_type?: ReportTargetType
    status?: ReportStatus
    start_date?: string
    end_date?: string
  }) => {
    const response = await api.get<ApiResponse<PaginatedResult<ModerationReport>>>(
      "/moderation/reports/mine",
      { params }
    )
    return response.data.data
  },

  updateReportStatus: async (
    id: string,
    payload: { status: ReportStatus; admin_note?: string | null }
  ) => {
    const response = await api.patch<ApiResponse<ModerationReport>>(
      `/moderation/admin/reports/${id}/status`,
      payload
    )
    return response.data.data
  },

  deletePostAsAdmin: async (id: string, reportId?: string | null) => {
    await api.delete(`/moderation/admin/posts/${id}`, {
      data: reportId ? { report_id: reportId } : undefined,
    })
  },

  createRestriction: async (payload: {
    user_id: string
    feature: RestrictionFeature
    reason: string
    ends_at?: string | null
    report_id?: string | null
  }) => {
    const response = await api.post<ApiResponse<UserRestriction>>(
      "/moderation/admin/restrictions",
      payload
    )
    return response.data.data
  },

  listRestrictions: async (params: {
    page?: number
    limit?: number
    user_id?: string
    feature?: RestrictionFeature
    status?: RestrictionStatus
  }) => {
    const response = await api.get<ApiResponse<PaginatedResult<UserRestriction>>>(
      "/moderation/admin/restrictions",
      { params }
    )
    return response.data.data
  },

  revokeRestriction: async (id: string) => {
    const response = await api.patch<ApiResponse<UserRestriction>>(
      `/moderation/admin/restrictions/${id}/revoke`
    )
    return response.data.data
  },
}
