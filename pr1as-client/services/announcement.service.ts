import { api } from "@/lib/axios"

type ApiResponse<T> = {
  success: boolean
  data?: T
  message?: string
}

export type DisplayType = "popup" | "banner" | "inline"
export type DisplayBehavior = "always" | "once_session" | "once_device" | "once_daily"
export type TargetRole = "client" | "worker" | "all"
export type RedirectTarget = "_self" | "_blank"

export type Announcement = {
  id: string
  title: string
  content: string
  images: string[]
  display_types: DisplayType[]
  display_behavior: DisplayBehavior
  target_roles: TargetRole[]
  placements: string[]
  redirect_url: string | null
  redirect_target: RedirectTarget
  allow_close: boolean
  is_active: boolean
  start_date: string | null
  end_date: string | null
  priority: number
  created_at: string
  updated_at: string
}

export type PaginatedAnnouncements = {
  data: Announcement[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export type CreateAnnouncementInput = {
  title: string
  content: string
  images?: string[]
  display_types: DisplayType[]
  display_behavior?: DisplayBehavior
  target_roles?: TargetRole[]
  placements: string[]
  redirect_url?: string | null
  redirect_target?: RedirectTarget
  allow_close?: boolean
  is_active?: boolean
  start_date?: string | null
  end_date?: string | null
  priority?: number
}

export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput>

export const announcementService = {
  getByPlacement: async (placement: string): Promise<Announcement | null> => {
    const response = await api.get<ApiResponse<Announcement | null>>(
      "/announcements/by-placement",
      { params: { placement } }
    )
    return response.data.data ?? null
  },

  adminList: async (params?: {
    page?: number
    limit?: number
    placement?: string
    is_active?: boolean
  }): Promise<PaginatedAnnouncements | undefined> => {
    const response = await api.get<ApiResponse<PaginatedAnnouncements>>(
      "/admin/announcements",
      { params }
    )
    return response.data.data
  },

  adminGet: async (id: string): Promise<Announcement | undefined> => {
    const response = await api.get<ApiResponse<Announcement>>(
      `/admin/announcements/${id}`
    )
    return response.data.data
  },

  adminCreate: async (payload: CreateAnnouncementInput): Promise<Announcement | undefined> => {
    const response = await api.post<ApiResponse<Announcement>>(
      "/admin/announcements",
      payload
    )
    return response.data.data
  },

  adminUpdate: async (
    id: string,
    payload: UpdateAnnouncementInput
  ): Promise<Announcement | undefined> => {
    const response = await api.patch<ApiResponse<Announcement>>(
      `/admin/announcements/${id}`,
      payload
    )
    return response.data.data
  },

  adminDelete: async (id: string): Promise<void> => {
    await api.delete(`/admin/announcements/${id}`)
  },
}
