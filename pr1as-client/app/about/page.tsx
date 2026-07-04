import Link from "next/link"
import { getLocale, getTranslations } from "next-intl/server"
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

import { AnnouncementRenderer } from "@/components/announcement"
import { SiteLayout } from "@/components/layout/site-layout"
import { Button } from "@/components/ui/button"
import { siteConfig } from "@/config/site"
import { getServerAboutContent } from "@/lib/about-server"
import { pickLocalized, type LocalizedText } from "@/lib/locale"
import { cn } from "@/lib/utils"

export async function generateMetadata() {
  const t = await getTranslations("About")
  return {
    title: t("title"),
  }
}

type ResolvedItem = { title: string; description: string }

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

/**
 * Unwrap a single wrapping <p>…</p> so rich-text values can render inline
 * inside headings/labels. Plain-text fallbacks (no tags) are returned as-is.
 */
function stripOuterParagraph(html: string): string {
  const trimmed = html.trim()
  if (/<\/p>\s*<p[\s>]/i.test(trimmed)) return trimmed
  const match = /^<p>([\s\S]*)<\/p>$/i.exec(trimmed)
  return match ? match[1] : trimmed
}

/** Render sanitized rich-text HTML. `inline` unwraps the outer paragraph. */
function RichText({
  html,
  as: Tag = "span",
  className,
  inline,
}: {
  html: string
  as?: React.ElementType
  className?: string
  inline?: boolean
}) {
  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{
        __html: inline ? stripOuterParagraph(html) : html,
      }}
    />
  )
}

export default async function AboutPage() {
  const locale = await getLocale()
  const t = await getTranslations("About")
  const content = await getServerAboutContent()

  // Per-field fallback chain: admin-edited DB value → next-intl message.
  const pick = (field: LocalizedText, fallbackKey: string): string =>
    pickLocalized(field, locale) || t(fallbackKey)

  const hero = {
    badge: pick(content.hero.badge, "hero.badge"),
    title: pick(content.hero.title, "hero.title"),
    subtitle: pick(content.hero.subtitle, "hero.subtitle"),
  }
  const what = {
    title: pick(content.what.title, "what.title"),
    tagline: pick(content.what.tagline, "what.tagline"),
    body:
      pickLocalized(content.what.body, locale) ||
      (t.raw("what.paragraphs") as string[]).map((p) => `<p>${p}</p>`).join(""),
  }

  const resolveItems = (
    items: { title: LocalizedText; description: LocalizedText }[],
    fallbackKey: string
  ): ResolvedItem[] => {
    if (items.length > 0) {
      return items.map((item) => ({
        title: pickLocalized(item.title, locale) ?? "",
        description: pickLocalized(item.description, locale) ?? "",
      }))
    }
    return t.raw(fallbackKey) as ResolvedItem[]
  }

  const why = {
    title: pick(content.why.title, "why.title"),
    subtitle: pick(content.why.subtitle, "why.subtitle"),
    items: resolveItems(content.why.items, "why.items"),
  }
  const features = {
    title: pick(content.features.title, "features.title"),
    subtitle: pick(content.features.subtitle, "features.subtitle"),
    items: resolveItems(content.features.items, "features.items"),
  }
  const cta = {
    title: pick(content.cta.title, "cta.title"),
    subtitle: pick(content.cta.subtitle, "cta.subtitle"),
    primary: pick(content.cta.primary, "cta.primary"),
    secondary: pick(content.cta.secondary, "cta.secondary"),
  }

  return (
    <SiteLayout>
      <AnnouncementRenderer placement="about_popup" />
      <AnnouncementRenderer placement="about_banner" />
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/10 via-primary/5 to-background">
        <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative container mx-auto max-w-4xl px-4 py-14 text-center md:py-28">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <SparklesIcon className="size-3.5 text-primary" />
            <RichText html={hero.badge} inline />
          </span>
          <RichText
            as="h1"
            html={hero.title}
            inline
            className="mt-5 text-3xl font-bold tracking-tight text-balance md:text-5xl"
          />
          <RichText
            as="p"
            html={hero.subtitle}
            inline
            className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground md:text-lg"
          />
        </div>
      </section>

      <div className="container mx-auto max-w-5xl px-4 py-12 md:py-24">
        <section className="mb-16 md:mb-24">
          <div className="grid items-center gap-8 md:grid-cols-2 md:gap-10">
            <div>
              <RichText
                as="h2"
                html={what.title}
                inline
                className="text-2xl font-bold tracking-tight md:text-3xl"
              />
              <div className="prose prose-sm mt-4 max-w-none space-y-4 leading-relaxed text-muted-foreground md:mt-5 md:text-base dark:prose-invert">
                <RichText html={what.body} />
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
                      <RichText
                        as="p"
                        html={what.tagline}
                        inline
                        className="truncate text-xs text-muted-foreground"
                      />
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3">
                    {features.items.slice(0, 4).map((item, idx) => {
                      const Icon = featureIcons[idx]
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-2 rounded-xl border bg-card/60 px-3 py-2.5"
                        >
                          <Icon className="size-4 shrink-0 text-primary" />
                          <RichText
                            html={item.title}
                            inline
                            className="truncate text-xs font-medium"
                          />
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
            <RichText
              as="h2"
              html={why.title}
              inline
              className="text-2xl font-bold tracking-tight md:text-3xl"
            />
            <RichText
              as="p"
              html={why.subtitle}
              inline
              className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base"
            />
          </div>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-5 md:grid-cols-2">
            {why.items.map((item, idx) => {
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
                    <RichText
                      as="h3"
                      html={item.title}
                      inline
                      className="text-base font-semibold sm:mt-4"
                    />
                    <RichText
                      as="p"
                      html={item.description}
                      inline
                      className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:mt-2"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="mb-16 md:mb-24">
          <div className="mx-auto max-w-2xl text-center">
            <RichText
              as="h2"
              html={features.title}
              inline
              className="text-2xl font-bold tracking-tight md:text-3xl"
            />
            <RichText
              as="p"
              html={features.subtitle}
              inline
              className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base"
            />
          </div>
          <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {features.items.map((item, idx) => {
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
                    <RichText
                      as="h3"
                      html={item.title}
                      inline
                      className="text-base font-semibold sm:mt-4"
                    />
                    <RichText
                      as="p"
                      html={item.description}
                      inline
                      className="mt-1.5 text-sm leading-relaxed text-muted-foreground sm:mt-2"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
        <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 to-primary/5 p-7 text-center md:p-14">
          <div className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative">
            <RichText
              as="h2"
              html={cta.title}
              inline
              className="text-2xl font-bold tracking-tight md:text-3xl"
            />
            <RichText
              as="p"
              html={cta.subtitle}
              inline
              className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base"
            />
            <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/services">
                  <RichText html={cta.primary} inline />
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Link href="/pricing">
                  <RichText html={cta.secondary} inline />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </SiteLayout>
  )
}
