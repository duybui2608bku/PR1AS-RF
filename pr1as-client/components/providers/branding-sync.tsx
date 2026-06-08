"use client"

import * as React from "react"

import { useSiteSettings } from "@/lib/hooks/use-site-settings"

/**
 * Keeps the browser tab favicon in sync with the admin-configured `faviconUrl`
 * during a live SPA session. The root layout's `generateMetadata` already sets
 * the correct favicon on initial/hard load; this only patches the live document
 * so admins see their change immediately after saving (no hard reload needed).
 */
export function BrandingSync() {
  const { data: settings } = useSiteSettings()
  const faviconUrl = settings?.faviconUrl

  React.useEffect(() => {
    if (!faviconUrl) return
    if (typeof document === "undefined") return

    const selector = "link[rel~='icon']"
    let link = document.head.querySelector<HTMLLinkElement>(selector)
    if (!link) {
      link = document.createElement("link")
      link.rel = "icon"
      document.head.appendChild(link)
    }
    if (link.href !== faviconUrl) {
      link.href = faviconUrl
    }
  }, [faviconUrl])

  return null
}
