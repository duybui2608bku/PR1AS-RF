import { ChatPage } from "@/components/chat/chat-page"
import { privateRouteMetadata } from "@/lib/seo"

export const metadata = {
  ...privateRouteMetadata,
  title: "Tranh chấp",
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
