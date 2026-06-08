import { api } from "@/lib/axios"
import { siteConfig } from "@/config/site"

export interface SiteSettings {
  // Identity
  name: string
  shortName: string
  description: string
  logoUrl: string
  faviconUrl: string
  // SEO
  siteUrl: string
  contactEmail: string
  ogImageUrl: string
  keywords: string
  twitterHandle: string
  // Social
  facebook: string
  twitter: string
  zalo: string
  github: string
  // Maintenance
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

// Fallback used when the API is unreachable (e.g. cold start before server is ready).
function buildDefaults(): SiteSettings {
  return {
    name: siteConfig.name,
    shortName: siteConfig.shortName,
    description: siteConfig.description,
    logoUrl: "",
    faviconUrl: "",
    siteUrl: siteConfig.url,
    contactEmail: siteConfig.contactEmail,
    ogImageUrl: "",
    keywords:
      "PR1AS, booking dịch vụ, freelancer Việt Nam, đặt lịch dịch vụ, worker marketplace",
    twitterHandle: "",
    facebook: siteConfig.links.facebook,
    twitter: siteConfig.links.twitter,
    zalo: siteConfig.links.zalo,
    github: siteConfig.links.github,
    maintenanceMode: false,
    maintenanceMessage:
      "Hệ thống đang được bảo trì và nâng cấp. Vui lòng quay lại sau.",
  }
}

async function get(): Promise<SiteSettings> {
  try {
    const res = await api.get<ApiResponse<SiteSettings>>("/site-settings")
    return res.data.data ?? buildDefaults()
  } catch {
    return buildDefaults()
  }
}

async function save(patch: Partial<SiteSettings>): Promise<SiteSettings> {
  const res = await api.patch<ApiResponse<SiteSettings>>("/site-settings", patch)
  return res.data.data!
}

async function reset(): Promise<SiteSettings> {
  const res = await api.post<ApiResponse<SiteSettings>>("/site-settings/reset")
  return res.data.data!
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
