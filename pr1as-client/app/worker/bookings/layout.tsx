import { getTranslations } from "next-intl/server"

import { privateRouteMetadata } from "@/lib/seo"

export async function generateMetadata() {
  const t = await getTranslations("SEO")
  return {
    ...privateRouteMetadata,
    title: t("workerBookingsTitle"),
  }
}

export default function WorkerBookingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
