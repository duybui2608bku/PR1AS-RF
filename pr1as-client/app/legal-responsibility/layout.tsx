import { getTranslations } from "next-intl/server"

import { createPageMetadata } from "@/lib/seo"

export async function generateMetadata() {
  const t = await getTranslations("SEO")
  return createPageMetadata({
    title: t("legalResponsibilityTitle"),
    description: t("legalResponsibilityDescription"),
    path: "/legal-responsibility",
  })
}

export default function LegalResponsibilityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
