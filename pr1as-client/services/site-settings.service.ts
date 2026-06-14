import { api } from "@/lib/axios"
import { siteConfig } from "@/config/site"


export interface LocalizedSettingText {
  vi: string
  en: string
  zh: string
}

export interface SiteSettings {
  name: string
  shortName: string
  description: LocalizedSettingText
  logoUrl: string
  faviconUrl: string
  siteUrl: string
  contactEmail: string
  ogImageUrl: string
  keywords: LocalizedSettingText
  twitterHandle: string
  facebook: string
  tiktok: string
  thread: string
  instagram: string
  maintenanceMode: boolean
  maintenanceMessage: string
}

export interface MaintenanceStatus {
  maintenanceMode: boolean
  maintenanceMessage: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
}


function buildDefaults(): SiteSettings {
  return {
    name: siteConfig.name,
    shortName: siteConfig.shortName,
    description: {
      vi: siteConfig.description,
      en: "PR1AS connects customers with trusted workers and freelancers to find services, book appointments, manage bookings and pay online.",
      zh: "PR1AS 连接客户与值得信赖的工作者和自由职业者，帮助查找服务、预约、管理订单并在线付款。",
    },
    logoUrl: "",
    faviconUrl: "",
    siteUrl: siteConfig.url,
    contactEmail: siteConfig.contactEmail,
    ogImageUrl: "",
    keywords: {
      vi: "PR1AS, booking dịch vụ, freelancer Việt Nam, đặt lịch dịch vụ, worker marketplace",
      en: "PR1AS, service booking, freelancers, online booking, worker marketplace",
      zh: "PR1AS, 服务预约, 自由职业者, 在线预约, 工作者市场",
    },
    twitterHandle: "",
    facebook: siteConfig.links.facebook,
    tiktok: siteConfig.links.tiktok,
    thread: siteConfig.links.thread,
    instagram: siteConfig.links.instagram,
    maintenanceMode: false,
    maintenanceMessage:
      "Hệ thống đang được bảo trì và nâng cấp. Vui lòng quay lại sau.",
  }
}

function normalizeLocalized(
  value: unknown,
  fallback: LocalizedSettingText
): LocalizedSettingText {
  if (typeof value === "string") return { ...fallback, vi: value }
  if (value && typeof value === "object") {
    return { ...fallback, ...(value as Partial<LocalizedSettingText>) }
  }
  return { ...fallback }
}

function normalizeSettings(settings: SiteSettings): SiteSettings {
  const defaults = buildDefaults()
  return {
    ...settings,
    description: normalizeLocalized(settings.description, defaults.description),
    keywords: normalizeLocalized(settings.keywords, defaults.keywords),
  }
}

async function get(): Promise<SiteSettings> {
  try {
    const res = await api.get<ApiResponse<SiteSettings>>("/site-settings")
    return res.data.data ? normalizeSettings(res.data.data) : buildDefaults()
  } catch {
    return buildDefaults()
  }
}

async function save(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  const res = await api.patch<ApiResponse<SiteSettings>>("/site-settings", patch)
  return normalizeSettings(res.data.data!)
}

async function reset(): Promise<SiteSettings> {
  const res = await api.post<ApiResponse<SiteSettings>>("/site-settings/reset")
  return normalizeSettings(res.data.data!)
}

async function getMaintenanceStatus(): Promise<MaintenanceStatus> {
  try {
    const res = await api.get<ApiResponse<MaintenanceStatus>>("/site-settings/maintenance")
    return res.data.data ?? { maintenanceMode: false, maintenanceMessage: "" }
  } catch {
    return { maintenanceMode: false, maintenanceMessage: "" }
  }
}

export const siteSettingsService = { get, save, reset, getMaintenanceStatus }
