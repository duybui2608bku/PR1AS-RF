import { privateRouteMetadata } from "@/lib/seo"

export const metadata = {
  ...privateRouteMetadata,
  title: "Ví",
}

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return children
}
