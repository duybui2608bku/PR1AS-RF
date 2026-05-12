import { privateRouteMetadata } from "@/lib/seo"

export const metadata = {
  ...privateRouteMetadata,
  title: "Chat",
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children
}
