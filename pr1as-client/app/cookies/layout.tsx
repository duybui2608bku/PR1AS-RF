import { getTranslations } from "next-intl/server"

import { createPageMetadata } from "@/lib/seo"

export async function generateMetadata() {
  const t = await getTranslations("SEO")
  return createPageMetadata({
    title: t("cookiesTitle"),
    description: t("cookiesDescription"),
    path: "/cookies",
  })
}

export default function CookiesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
