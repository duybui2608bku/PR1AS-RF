import Link from "next/link"
import { getTranslations } from "next-intl/server"
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  BellIcon,
  CalendarCheckIcon,
  GlobeIcon,
  HeadphonesIcon,
  MessageCircleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  WalletIcon,
} from "lucide-react"

import { SiteLayout } from "@/components/layout/site-layout"
import { Button } from "@/components/ui/button"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"

export async function generateMetadata() {
  const t = await getTranslations("About")
  return {
    title: t("title"),
  }
}

type Item = { title: string; description: string }


const whyIcons = [ShieldCheckIcon, BadgeCheckIcon, WalletIcon, HeadphonesIcon]

const featureIcons = [
  CalendarCheckIcon,
  MessageCircleIcon,
  StarIcon,
  WalletIcon,
  BellIcon,
  GlobeIcon,
]


const whyAccents = [
  "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
]

export default async function AboutPage() {
  const t = await getTranslations("About")

  const whatParagraphs = t.raw("what.paragraphs") as string[]
  const whyItems = t.raw("why.items") as Item[]
  const featureItems = t.raw("features.items") as Item[]

  return (
    <SiteLayout>
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/10 via-primary/5 to-background">
        <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative container mx-auto max-w-4xl px-4 py-14 text-center md:py-28">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <SparklesIcon className="size-3.5 text-primary" />
            {t("hero.badge")}
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-balance md:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground md:text-lg">
            {t("hero.subtitle")}
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-4 py-12 md:py-24">
        <section className="mb-16 md:mb-24">
          <div className="grid items-center gap-8 md:grid-cols-2 md:gap-10">
            <div>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                {t("what.title")}
              </h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground md:mt-5 md:text-base">
                {whatParagraphs.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 p-3 sm:p-5">
                <div className="rounded-2xl border bg-background/70 p-5 backdrop-blur sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
                      <SparklesIcon className="size-6" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">
                        {siteConfig.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {t("what.tagline")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3">
                    {featureItems.slice(0, 4).map((item, idx) => {
                      const Icon = featureIcons[idx]
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 rounded-xl border bg-card/60 px-3 py-2.5"
                        >
                          <Icon className="size-4 shrink-0 text-primary" />
                          <span className="truncate text-xs font-medium">
                            {item.title}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-16 md:mb-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              {t("why.title")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              {t("why.subtitle")}
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-5 md:grid-cols-2">
            {whyItems.map((item, idx) => {
              const Icon = whyIcons[idx % whyIcons.length]
              const accent = whyAccents[idx % whyAccents.length]
              return (
                <div
                  key={idx}
                  className="group flex gap-4 rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md sm:flex-col sm:gap-0 sm:p-6"
                >
                  <span
                    className={cn(
                      "flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 sm:size-12",
                      accent
                    )}
                  >
                    <Icon className="size-5 sm:size-6" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold sm:mt-4">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:mt-2">
                      {item.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="mb-16 md:mb-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              {t("features.title")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              {t("features.subtitle")}
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {featureItems.map((item, idx) => {
              const Icon = featureIcons[idx % featureIcons.length]
              return (
                <div
                  key={idx}
                  className="flex gap-4 rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40 sm:flex-col sm:gap-0 sm:p-6"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold sm:mt-4">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:mt-2">
                      {item.description}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
        <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 to-primary/5 p-7 text-center md:p-14">
          <div className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              {t("cta.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {t("cta.subtitle")}
            </p>
            <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/services">
                  {t("cta.primary")}
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Link href="/pricing">{t("cta.secondary")}</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </SiteLayout>
  )
}
