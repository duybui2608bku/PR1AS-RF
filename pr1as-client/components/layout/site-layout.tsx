import * as React from "react"

import { AdminSiteGate } from "@/components/layout/admin-site-gate"
import { ScrollToTopButton } from "@/components/layout/scroll-to-top-button"
import { SiteFooter } from "@/components/layout/site-footer"
import { SiteHeader } from "@/components/layout/site-header"

export function SiteLayout({
  children,
  hideFooter = false,
}: {
  children: React.ReactNode
  hideFooter?: boolean
}) {
  return (
    <AdminSiteGate>
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        {/* Footer chỉ hiển thị từ md trở lên; trên mobile dùng bottom nav + Cài đặt */}
        {!hideFooter && <SiteFooter className="hidden md:block" />}
        <div className="h-bottomnav shrink-0 md:hidden" aria-hidden="true" />
        <ScrollToTopButton />
      </div>
    </AdminSiteGate>
  )
}
