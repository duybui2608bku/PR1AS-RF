import * as React from "react"

import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { AdminSiteGate } from "@/components/layout/admin-site-gate"
import { ScrollToTopButton } from "@/components/layout/scroll-to-top-button"

export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminSiteGate>
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <ScrollToTopButton />
      </div>
    </AdminSiteGate>
  )
}
