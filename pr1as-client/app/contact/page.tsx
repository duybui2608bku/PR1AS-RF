import { getLocale, getTranslations } from "next-intl/server"
import { ClockIcon, MailIcon, MapPinIcon, PhoneIcon } from "lucide-react"

import { RichText } from "@/components/content/rich-text"
import { SiteLayout } from "@/components/layout/site-layout"
import { siteConfig } from "@/config/site"
import { getServerContactContent } from "@/lib/contact-server"
import { pickLocalized } from "@/lib/locale"

export async function generateMetadata() {
  const t = await getTranslations("Contact")
  return {
    title: t("title"),
  }
}

type Channel = {
  icon: typeof MailIcon
  label: string
  value: string
  href?: string
}

export default async function ContactPage() {
  const locale = await getLocale()
  const t = await getTranslations("Contact")
  const content = await getServerContactContent()

  const title = pickLocalized(content.title, locale) || t("title")
  const subtitle = pickLocalized(content.subtitle, locale) || t("subtitle")
  const bodyHtml = pickLocalized(content.body, locale) || ""
  const address = pickLocalized(content.address, locale) || ""
  const hours = pickLocalized(content.hours, locale) || ""
  const email = content.email || siteConfig.contactEmail
  const phone = content.phone

  const channels: Channel[] = [
    email
      ? {
          icon: MailIcon,
          label: t("email"),
          value: email,
          href: `mailto:${email}`,
        }
      : null,
    phone
      ? {
          icon: PhoneIcon,
          label: t("phone"),
          value: phone,
          href: `tel:${phone.replace(/\s+/g, "")}`,
        }
      : null,
    address ? { icon: MapPinIcon, label: t("address"), value: address } : null,
    hours ? { icon: ClockIcon, label: t("hours"), value: hours } : null,
  ].filter((c): c is Channel => c !== null)

  return (
    <SiteLayout>
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-primary/10 via-primary/5 to-background">
        <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative container mx-auto max-w-3xl px-4 py-14 text-center md:py-24">
          <h1 className="text-3xl font-bold tracking-tight text-balance md:text-5xl">
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground md:text-lg">
            {subtitle}
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-12 md:py-20">
        <div className="grid gap-4 sm:grid-cols-2">
          {channels.map((channel) => {
            const Icon = channel.icon
            const inner = (
              <>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    {channel.label}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold break-words">
                    {channel.value}
                  </p>
                </div>
              </>
            )
            return channel.href ? (
              <a
                key={channel.label}
                href={channel.href}
                className="flex items-center gap-4 rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40"
              >
                {inner}
              </a>
            ) : (
              <div
                key={channel.label}
                className="flex items-center gap-4 rounded-2xl border bg-card p-5"
              >
                {inner}
              </div>
            )
          })}
        </div>

        {bodyHtml ? (
          <div className="mt-10 rounded-2xl border bg-card p-6 md:p-8">
            <RichText html={bodyHtml} />
          </div>
        ) : null}
      </div>
    </SiteLayout>
  )
}
