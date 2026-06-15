import { getTranslations } from "next-intl/server"

import { createPageMetadata } from "@/lib/seo"

export async function generateMetadata() {
  const t = await getTranslations("SEO")
  return createPageMetadata({
    title: t("bookingProcessTitle"),
    description: t("bookingProcessDescription"),
    path: "/booking-process",
  })
}

export default function BookingProcessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
