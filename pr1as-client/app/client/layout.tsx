import * as React from "react"
import { getTranslations } from "next-intl/server"

import { AuthGuard } from "@/components/auth/auth-guard"
import { SiteLayout } from "@/components/layout/site-layout"
import { privateRouteMetadata } from "@/lib/seo"

export async function generateMetadata() {
  const t = await getTranslations("SEO")
  return {
    ...privateRouteMetadata,
    title: t("clientTitle"),
  }
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteLayout>
      <AuthGuard>{children}</AuthGuard>
    </SiteLayout>
  )
}
