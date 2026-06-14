import "server-only"

import { siteConfig } from "@/config/site"
import type { SiteSettings } from "@/services/site-settings.service"

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

export async function getServerSiteSettings(): Promise<SiteSettings> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3052/api"
    const res = await fetch(`${apiBase}/site-settings`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return buildDefaults()
    const json = (await res.json()) as { data?: Partial<SiteSettings> }
    return { ...buildDefaults(), ...(json.data ?? {}) }
  } catch {
    return buildDefaults()
  }
}
