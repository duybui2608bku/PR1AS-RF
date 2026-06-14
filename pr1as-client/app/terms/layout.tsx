import { getTranslations } from "next-intl/server"

import { createPageMetadata } from "@/lib/seo"

export async function generateMetadata() {
  const t = await getTranslations("SEO")
  return createPageMetadata({
    title: t("termsTitle"),
    description: t("termsDescription"),
    path: "/terms",
  })
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
