import { getTranslations } from "next-intl/server"

import { ChatPage } from "@/components/chat/chat-page"
import { privateRouteMetadata } from "@/lib/seo"

export async function generateMetadata() {
  const t = await getTranslations("SEO")
  return {
    ...privateRouteMetadata,
    title: t("disputesTitle"),
  }
}

export default function DashboardDisputesPage() {
  return (
    <ChatPage
      initialMode="group"
      variant="embedded"
      title="Tranh chấp"
      showHomeButton={false}
    />
  )
}
