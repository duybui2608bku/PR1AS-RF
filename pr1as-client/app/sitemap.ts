import type { MetadataRoute } from "next"

import { getAbsoluteUrl } from "@/lib/seo"

const publicRoutes = [
  { path: "/services", priority: 1, changeFrequency: "weekly" as const },
  { path: "/pricing", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/posts", priority: 0.7, changeFrequency: "daily" as const },
  { path: "/privacy", priority: 0.3, changeFrequency: "monthly" as const },
  { path: "/terms", priority: 0.3, changeFrequency: "monthly" as const },
] as const

// Fixed at build time — prevents search engines from re-crawling
// all pages on every sitemap fetch just because new Date() changed.
const BUILD_DATE = new Date("2025-05-31")

export default function sitemap(): MetadataRoute.Sitemap {
  return publicRoutes.map((route) => ({
    url: getAbsoluteUrl(route.path),
    lastModified: BUILD_DATE,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
