import { getTranslations } from "next-intl/server"

import { AuthShell } from "@/components/auth/auth-shell"
import { privateRouteMetadata } from "@/lib/seo"

export async function generateMetadata() {
  const t = await getTranslations("SEO")
  return {
    ...privateRouteMetadata,
    title: t("accountTitle"),
  }
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>
}
