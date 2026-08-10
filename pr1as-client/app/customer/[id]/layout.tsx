import { getTranslations } from "next-intl/server"

import { privateRouteMetadata } from "@/lib/seo"

export async function generateMetadata() {
  const t = await getTranslations("CustomerProfile")

  // noindex: unlike a worker listing, a client's profile is not marketplace
  // content — it exists so logged-in users can vet whoever posted a job.
  return {
    ...privateRouteMetadata,
    title: t("pageTitle"),
  }
}

export default function CustomerProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
