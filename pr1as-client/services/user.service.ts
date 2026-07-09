import { api } from "@/lib/axios"
import type { AuthUser } from "@/lib/store/auth-store"
import type { WorkerPricingUnit, WorkerProfileUpdateInput } from "@/types"

export type UserRole = "client" | "worker" | "admin"
export type UserStatus = "active" | "banned"

// Admin-create accepts a wider status range than the list filter.
export type AdminUserStatus = "active" | "inactive" | "banned"

export interface AdminWorkerServiceInput {
  service_code: string
  pricing: {
    unit: WorkerPricingUnit
    duration: number
    price: number
    currency?: string
  }[]
}

export interface AdminCreateUserPayload {
  email: string
  password: string
  full_name: string
  phone?: string | null
  avatar?: string | null
  roles: Array<"client" | "worker">
  status?: AdminUserStatus
  worker_profile?: WorkerProfileUpdateInput
  worker_services?: AdminWorkerServiceInput[]
}

export interface AdminUpdateUserPayload {
  email?: string
  password?: string
  full_name: string
  phone?: string | null
  avatar?: string | null
  roles: Array<"client" | "worker">
  status?: AdminUserStatus
  worker_profile?: WorkerProfileUpdateInput
  worker_services?: AdminWorkerServiceInput[]
}

export interface AdminUserDetail extends UserListItem {
  worker_services?: Array<{
    service_code: string
    pricing: Array<{
      unit: "HOURLY" | "DAILY" | "MONTHLY"
      duration: number
      price: number
      currency?: string
      price_vnd?: number
    }>
  }>
}

export interface GetUsersParams {
  page?: number
  limit?: number
  search?: string
  role?: UserRole | ""
  status?: UserStatus | ""
  startDate?: string
  endDate?: string
  created_by_admin?: "true" | "false" | ""
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
    if (params.created_by_admin)
      query.set("created_by_admin", params.created_by_admin)

    const { data } = await api.get<
      ApiResponse<PaginatedResponse<UserListItem>>
    >(`/users?${query.toString()}`)
    return data.data
  },

  updateUserStatus: async (userId: string, payload: { status: UserStatus }) => {
    const { data } = await api.patch<ApiResponse<null>>(
      `/users/${userId}/status`,
      payload
    )
    return data
  },

  createUser: async (payload: AdminCreateUserPayload) => {
    const { data } = await api.post<ApiResponse<UserListItem>>(
      `/users`,
      payload
    )
    return data.data
  },

  getUser: async (id: string) => {
    const { data } = await api.get<ApiResponse<AdminUserDetail>>(`/users/${id}`)
    return data.data
  },

  updateUser: async (id: string, payload: AdminUpdateUserPayload) => {
    const { data } = await api.put<ApiResponse<UserListItem>>(
      `/users/${id}`,
      payload
    )
    return data.data
  },
}
