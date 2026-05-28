import * as React from "react"

import { AdminSiteGate } from "@/components/layout/admin-site-gate"
import { ScrollToTopButton } from "@/components/layout/scroll-to-top-button"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"

export function SiteLayout({
  children,
  showFooterOnMobile = false,
}: {
  children: React.ReactNode
  showFooterOnMobile?: boolean
}) {
  return (
    <AdminSiteGate>
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter
          className={showFooterOnMobile ? undefined : "hidden md:block"}
        />
        {/* Spacer đẩy content lên khỏi bottom nav trên mobile (tính cả iOS safe area) */}
        <div className="h-bottomnav shrink-0 md:hidden" aria-hidden="true" />
        <ScrollToTopButton />
      </div>
    </AdminSiteGate>
  )
}
