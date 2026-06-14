import { getTranslations } from "next-intl/server"

import { AdminDashboardShell } from "@/components/layout/admin-dashboard-shell"
import { privateRouteMetadata } from "@/lib/seo"

export async function generateMetadata() {
  const t = await getTranslations("SEO")
  return {
    ...privateRouteMetadata,
    title: t("dashboardTitle"),
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminDashboardShell>{children}</AdminDashboardShell>
}