import * as React from "react"
import { getTranslations } from "next-intl/server"

import { AuthGuard } from "@/components/auth/auth-guard"
import { SiteLayout } from "@/components/layout/site-layout"
import { privateRouteMetadata } from "@/lib/seo"

export async function generateMetadata() {
  const t = await getTranslations("Settings")
  return {
    ...privateRouteMetadata,
    title: t("pageTitle"),
  }
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
