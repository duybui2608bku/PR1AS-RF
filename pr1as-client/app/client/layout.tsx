import * as React from "react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { SiteLayout } from "@/components/layout/site-layout"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteLayout>
      <AuthGuard>{children}</AuthGuard>
    </SiteLayout>
  )
}
