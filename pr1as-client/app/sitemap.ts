import type { MetadataRoute } from "next"

import { getAbsoluteUrl } from "@/lib/seo"

const publicRoutes = [
  { path: "/services", priority: 1 },
  { path: "/pricing", priority: 0.8 },
  { path: "/posts", priority: 0.7 },
  { path: "/privacy", priority: 0.3 },
  { path: "/terms", priority: 0.3 },
] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return publicRoutes.map((route) => ({
    url: getAbsoluteUrl(route.path),
    lastModified,
    changeFrequency: route.path === "/posts" ? "daily" : "weekly",
    priority: route.priority,
  }))
}
