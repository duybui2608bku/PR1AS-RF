import { getTranslations } from "next-intl/server"

import { privateRouteMetadata } from "@/lib/seo"

export async function generateMetadata() {
  const t = await getTranslations("SEO")
  return {
    ...privateRouteMetadata,
    title: t("workerScheduleTitle"),
  }
}

export default function WorkerScheduleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
