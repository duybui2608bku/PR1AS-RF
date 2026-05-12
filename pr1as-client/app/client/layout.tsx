import * as React from "react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { SiteLayout } from "@/components/layout/site-layout"
import { privateRouteMetadata } from "@/lib/seo"

export const metadata = {
  ...privateRouteMetadata,
  title: "Khu vực khách hàng",
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteLayout>
      <AuthGuard>{children}</AuthGuard>
    </SiteLayout>
  )
}
