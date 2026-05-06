import { api } from "@/lib/axios"
import type { AuthUser } from "@/lib/store/auth-store"

export type UserRole = "client" | "worker" | "admin"
export type UserStatus = "active" | "banned"

export interface GetUsersParams {
  page?: number
  limit?: number
  search?: string
  role?: UserRole | ""
  status?: UserStatus | ""
  startDate?: string
  endDate?: string
}

export interface UserListItem extends AuthUser {
  last_login?: string | null
  created_at?: string
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export const userService = {
  getUsers: async (params: GetUsersParams = {}) => {
    const query = new URLSearchParams()
    if (params.page) query.set("page", String(params.page))
    if (params.limit) query.set("limit", String(params.limit))
    if (params.search) query.set("search", params.search)
    if (params.role) query.set("role", params.role)
    if (params.status) query.set("status", params.status)
    if (params.startDate) query.set("startDate", params.startDate)
    if (params.endDate) query.set("endDate", params.endDate)

    const { data } = await api.get<ApiResponse<PaginatedResponse<UserListItem>>>(
      `/users?${query.toString()}`,
    )
    return data.data
  },

  updateUserStatus: async (userId: string, payload: { status: UserStatus }) => {
    const { data } = await api.patch<ApiResponse<null>>(`/users/${userId}/status`, payload)
    return data
  },
}
