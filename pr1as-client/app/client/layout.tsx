import * as React from "react"
import { SiteLayout } from "@/components/layout/site-layout"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <SiteLayout>{children}</SiteLayout>
}
