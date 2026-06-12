import * as React from "react"

import { AuthGuard } from "@/components/auth/auth-guard"
import { SiteLayout } from "@/components/layout/site-layout"
import { privateRouteMetadata } from "@/lib/seo"

export const metadata = {
  ...privateRouteMetadata,
  title: "Cài đặt",
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SiteLayout hideFooter>
      <AuthGuard>{children}</AuthGuard>
    </SiteLayout>
  )
}
