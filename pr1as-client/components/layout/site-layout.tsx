import * as React from "react"

import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { AnnouncementPopup } from "@/components/layout/announcement-popup"
import { AdminSiteGate } from "@/components/layout/admin-site-gate"

export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminSiteGate>
      <div className="flex min-h-svh flex-col">
        <AnnouncementPopup />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </AdminSiteGate>
  )
}
