import { api } from "@/lib/axios"
import type {
  ApiResponse,
  CursorPaginatedResponse,
  PostPublic,
  PostRegistrantPublic,
} from "@/types"

export type ToggleRegistrationResponse = {
  registered: boolean
  registrations_count: number
}

export type RegistrationsListResponse = {
  data: PostRegistrantPublic[]
  total: number
}

export const postRegistrationService = {
  toggle: async (postId: string): Promise<ToggleRegistrationResponse> => {
    const { data } = await api.post<ApiResponse<ToggleRegistrationResponse>>(
      `/posts/${postId}/registrations`
    )
    return data.data
  },

  list: async (postId: string): Promise<RegistrationsListResponse> => {
    const { data } = await api.get<ApiResponse<RegistrationsListResponse>>(
      `/posts/${postId}/registrations`
    )
    return data.data
  },

  listRegisteredFeed: async (params: {
    cursor?: string
    limit?: number
  } = {}): Promise<CursorPaginatedResponse<PostPublic>> => {
    const query = new URLSearchParams()
    if (params.cursor) query.set("cursor", params.cursor)
    if (params.limit) query.set("limit", String(params.limit))
    const { data } = await api.get<ApiResponse<CursorPaginatedResponse<PostPublic>>>(
      `/posts/registered?${query.toString()}`
    )
    return data.data
  },
}
