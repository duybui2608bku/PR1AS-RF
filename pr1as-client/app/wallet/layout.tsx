import { getTranslations } from "next-intl/server"

import { privateRouteMetadata } from "@/lib/seo"

export async function generateMetadata() {
  const t = await getTranslations("Wallet")
  return {
    ...privateRouteMetadata,
    title: t("pageTitle"),
  }
}

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return children
}
