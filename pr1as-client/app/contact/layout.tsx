import { getTranslations } from "next-intl/server"

import { createPageMetadata } from "@/lib/seo"

export async function generateMetadata() {
  const t = await getTranslations("SEO")
  return createPageMetadata({
    title: t("contactTitle"),
    description: t("contactDescription"),
    path: "/contact",
  })
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
