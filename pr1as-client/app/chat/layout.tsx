import { getTranslations } from "next-intl/server"

import { privateRouteMetadata } from "@/lib/seo"

export async function generateMetadata() {
  const t = await getTranslations("SEO")
  return {
    ...privateRouteMetadata,
    title: t("chatTitle"),
  }
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children
}
