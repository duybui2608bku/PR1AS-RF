import { getTranslations } from "next-intl/server"

import { createPageMetadata } from "@/lib/seo"

export async function generateMetadata() {
  const t = await getTranslations("SEO")
  return createPageMetadata({
    title: t("privacyTitle"),
    description: t("privacyDescription"),
    path: "/privacy",
  })
}

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
