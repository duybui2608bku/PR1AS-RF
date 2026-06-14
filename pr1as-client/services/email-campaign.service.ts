import { api } from "@/lib/axios"

type ApiResponse<T> = {
  success: boolean
  data?: T
  message?: string
}

export type EmailCampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled"

export type EmailCampaignAudience = "all" | "clients" | "workers"

export type EmailSendLogStatus = "pending" | "sent" | "failed"

/** Locales a campaign can be authored in (mirrors the platform UI locales). */
export type EmailCampaignLocale = "vi" | "en" | "zh"

export const EMAIL_CAMPAIGN_LOCALES: EmailCampaignLocale[] = ["vi", "en", "zh"]

/** Subject / body authored per locale; only `default_locale` is guaranteed. */
export type LocalizedEmailContent = {
  vi?: string
  en?: string
  zh?: string
}

export type EmailCampaignCreator = {
  _id?: string
  id?: string
  full_name: string | null
  email: string
  avatar: string | null
}

export type EmailCampaign = {
  id: string
  _id?: string
  name: string
  subject: LocalizedEmailContent
  html_content: LocalizedEmailContent
  default_locale: EmailCampaignLocale
  audience: EmailCampaignAudience
  status: EmailCampaignStatus
  scheduled_at: string | null
  sent_at: string | null
  created_by: EmailCampaignCreator | string
  total_recipients: number
  sent_count: number
  failed_count: number
  created_at: string
  updated_at: string
}

export type EmailSendLog = {
  id: string
  _id?: string
  campaign_id: string
  recipient_id: EmailCampaignCreator | null
  recipient_email: string
  locale: EmailCampaignLocale
  status: EmailSendLogStatus
  sent_at: string | null
  error_message: string | null
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

export type CreateCampaignInput = {
  name: string
  subject: LocalizedEmailContent
  html_content: LocalizedEmailContent
  default_locale: EmailCampaignLocale
  audience: EmailCampaignAudience
  scheduled_at?: string | null
}

export type UpdateCampaignInput = Partial<CreateCampaignInput>

export const emailCampaignService = {
  list: async (params?: {
    page?: number
    limit?: number
    status?: EmailCampaignStatus
    audience?: EmailCampaignAudience
    from?: string
    to?: string
  }) => {
    const response = await api.get<ApiResponse<PaginatedResult<EmailCampaign>>>(
      "/admin/email-campaigns",
      { params }
    )
    return response.data.data
  },

  get: async (id: string) => {
    const response = await api.get<ApiResponse<EmailCampaign>>(
      `/admin/email-campaigns/${id}`
    )
    return response.data.data
  },

  create: async (payload: CreateCampaignInput) => {
    const response = await api.post<ApiResponse<EmailCampaign>>(
      "/admin/email-campaigns",
      payload
    )
    return response.data.data
  },

  update: async (id: string, payload: UpdateCampaignInput) => {
    const response = await api.patch<ApiResponse<EmailCampaign>>(
      `/admin/email-campaigns/${id}`,
      payload
    )
    return response.data.data
  },

  delete: async (id: string) => {
    await api.delete(`/admin/email-campaigns/${id}`)
  },

  send: async (id: string) => {
    const response = await api.post<ApiResponse<EmailCampaign>>(
      `/admin/email-campaigns/${id}/send`
    )
    return response.data.data
  },

  cancel: async (id: string) => {
    const response = await api.post<ApiResponse<EmailCampaign>>(
      `/admin/email-campaigns/${id}/cancel`
    )
    return response.data.data
  },

  listLogs: async (
    id: string,
    params?: { page?: number; limit?: number; status?: EmailSendLogStatus }
  ) => {
    const response = await api.get<ApiResponse<PaginatedResult<EmailSendLog>>>(
      `/admin/email-campaigns/${id}/logs`,
      { params }
    )
    return response.data.data
  },
}
