import { AdminDashboardShell } from "@/components/layout/admin-dashboard-shell"
import { privateRouteMetadata } from "@/lib/seo"

export const metadata = {
  ...privateRouteMetadata,
  title: "Quản trị",
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminDashboardShell>{children}</AdminDashboardShell>
}