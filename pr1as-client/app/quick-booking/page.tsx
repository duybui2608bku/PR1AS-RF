import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { SiteLayout } from "@/components/layout/site-layout"

import { QuickBookingWizard } from "./quick-booking-wizard"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("QuickBooking")
  return {
    title: t("title"),
    description: t("subtitle"),
  }
}

export default async function QuickBookingPage() {
  const t = await getTranslations("QuickBooking")

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
        <QuickBookingWizard />
      </section>
    </SiteLayout>
  )
}
