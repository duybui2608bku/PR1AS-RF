import { cache } from "react"

import { api } from "@/lib/axios"
import { pickLocalized, type LocalizedText } from "@/lib/locale"

export type { LocalizedText }

type ApiResponse<T> = {
  success: boolean
  statusCode?: number
  message?: string
  data?: T
}

export type ServiceItem = {
  id: string
  code: string
  category: string
  icon: string | null
  name: LocalizedText
  description: LocalizedText
  companionship_level: number | null
  is_active: boolean
  deprecated_at: string | null
  rules: {
    physical_touch?: boolean
    intellectual_conversation_required?: boolean
    dress_code?: string
  } | null
  created_at: string
  updated_at: string
}

type ServicesResponse = {
  services: ServiceItem[]
  count: number
}

const getServices = cache(async (): Promise<ServiceItem[]> => {
  const response = await api.get<ApiResponse<ServicesResponse>>("/services")
  return response.data.data?.services ?? []
})

export const serviceService = {
  getServices,
  getName: (name: LocalizedText, locale: string) =>
    pickLocalized(name, locale) ?? "Dịch vụ",
  getDescription: (desc: LocalizedText, locale: string) =>
    pickLocalized(desc, locale),
}
