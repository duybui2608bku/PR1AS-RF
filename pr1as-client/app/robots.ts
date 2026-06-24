import type { MetadataRoute } from "next"

import { siteConfig } from "@/config/site"
import { getAbsoluteUrl } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/services",
          "/pricing",
          "/posts",
          "/quick-booking",
          "/worker/",
          "/privacy",
          "/terms",
        ],
        disallow: [
          "/dashboard",
          "/client",
          "/wallet",
          "/chat",
          "/worker/bookings",
          "/worker/schedule",
          "/worker/setup",
          "/login",
          "/register",
          "/reset-password",
          "/verify-email",
        ],
      },
    ],
    sitemap: getAbsoluteUrl("/sitemap.xml"),
    host: siteConfig.url,
  }
}
