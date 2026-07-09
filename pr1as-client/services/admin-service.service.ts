import { api } from "@/lib/axios"
import type { LocalizedText } from "@/lib/locale"
import type { ServiceItem } from "@/services/service.service"

type ApiResponse<T> = {
  success: boolean
  message?: string
  data?: T
}

export type AdminServiceItem = ServiceItem

// `code` is generated server-side from the English name; admins never supply it.
export type CreateServicePayload = {
  category: string
  icon: string
  name: LocalizedText
  description?: LocalizedText
}

export type UpdateServicePayload = CreateServicePayload

type ServicesListResponse = {
  services: AdminServiceItem[]
  count: number
}

type ServiceResponse = {
  service: AdminServiceItem
}

const list = async (params?: {
  category?: string
  is_active?: boolean
}): Promise<AdminServiceItem[]> => {
  const response = await api.get<ApiResponse<ServicesListResponse>>(
    "/admin/services",
    { params }
  )
  return response.data.data?.services ?? []
}

const create = async (
  payload: CreateServicePayload
): Promise<AdminServiceItem | null> => {
  const response = await api.post<ApiResponse<ServiceResponse>>(
    "/admin/services",
    payload
  )
  return response.data.data?.service ?? null
}

const update = async (
  id: string,
  payload: UpdateServicePayload
): Promise<AdminServiceItem | null> => {
  const response = await api.patch<ApiResponse<ServiceResponse>>(
    `/admin/services/${id}`,
    payload
  )
  return response.data.data?.service ?? null
}

const deprecate = async (id: string): Promise<AdminServiceItem | null> => {
  const response = await api.post<ApiResponse<ServiceResponse>>(
    `/admin/services/${id}/deprecate`
  )
  return response.data.data?.service ?? null
}

const reactivate = async (id: string): Promise<AdminServiceItem | null> => {
  const response = await api.post<ApiResponse<ServiceResponse>>(
    `/admin/services/${id}/reactivate`
  )
  return response.data.data?.service ?? null
}

const remove = async (id: string): Promise<void> => {
  await api.delete(`/admin/services/${id}`)
}

export const adminServiceApi = {
  list,
  create,
  update,
  deprecate,
  reactivate,
  remove,
}
