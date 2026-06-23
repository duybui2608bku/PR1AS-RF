import { siteConfig } from "@/config/site"
import { api } from "@/lib/axios"

export interface LocalizedSettingText {
  vi: string
  en: string
  zh: string
  ko: string
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
      ko: "PR1AS는 신뢰할 수 있는 작업자와 프리랜서를 연결해 서비스를 찾고, 예약하고, 예약을 관리하고, 온라인으로 결제할 수 있게 해줍니다.",
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
      ko: "PR1AS, 서비스 예약, 프리랜서, 온라인 예약, 작업자 마켓플레이스",
    },
    twitterHandle: "",
    facebook: siteConfig.links.facebook,
    tiktok: siteConfig.links.tiktok,
    thread: siteConfig.links.thread,
    instagram: siteConfig.links.instagram,
    maintenanceMode: false,
    maintenanceMessage: "시스템이 현재 점검 및 업그레이드 중입니다. 잠시 후 다시 이용해 주세요.",
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
