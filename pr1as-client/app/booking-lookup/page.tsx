import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { SiteLayout } from "@/components/layout/site-layout"

import { BookingLookupClient } from "./booking-lookup-client"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("BookingLookup")
  return {
    title: t("title"),
    description: t("subtitle"),
  }
}

export default async function BookingLookupPage() {
  const t = await getTranslations("BookingLookup")

  return (
    <SiteLayout>
      <section className="container mx-auto px-4 py-10 md:py-14">
        <div className="mb-6 max-w-3xl space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
            {t("title")}
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            {t("subtitle")}
          </h1>
        </div>
        <BookingLookupClient />
      </section>
    </SiteLayout>
  )
}
