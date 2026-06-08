import "server-only"

import { siteConfig } from "@/config/site"
import type { SiteSettings } from "@/services/site-settings.service"

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

/**
 * Server-side fetch of site settings for use in `generateMetadata` / server
 * components. Uses a plain `fetch` (not the client axios instance, which reads
 * the auth token from the Zustand store) and short-lived ISR caching so admin
 * changes to logo/favicon/name propagate without a redeploy.
 */
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
