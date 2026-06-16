"use client"

import Image from "next/image"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import * as React from "react"

import {
  FacebookIcon,
  InstagramIcon,
  ThreadsIcon,
  TikTokIcon,
} from "@/components/icons/brand-icons"
import { siteConfig } from "@/config/site"
import { footerNav } from "@/config/nav"
import { useSiteSettings } from "@/lib/hooks/use-site-settings"
import type { LocalizedSettingText } from "@/services/site-settings.service"
import { cn } from "@/lib/utils"

const socialLinks = [
  {
    label: "Facebook",
    href: siteConfig.links.facebook,
    icon: <FacebookIcon aria-hidden="true" className="size-4" />,
  },
  {
    label: "TikTok",
    href: siteConfig.links.tiktok,
    icon: <TikTokIcon aria-hidden="true" className="size-4" />,
  },
  {
    label: "Threads",
    href: siteConfig.links.thread,
    icon: <ThreadsIcon aria-hidden="true" className="size-4" />,
  },
  {
    label: "Instagram",
    href: siteConfig.links.instagram,
    icon: <InstagramIcon aria-hidden="true" className="size-4" />,
  },
] as const

export function SiteFooter({ className }: { className?: string }) {
  const t = useTranslations("Footer")
  const locale = useLocale()
  const { data: siteSettings } = useSiteSettings()

  const [isMounted, setIsMounted] = React.useState(false)
  React.useEffect(() => setIsMounted(true), [])

  const brandName = siteSettings?.name || siteConfig.name
  const brandLogo = siteSettings?.logoUrl
  const localeKey = locale as keyof LocalizedSettingText
  const brandDescription =
    siteSettings?.description?.[localeKey] || siteConfig.description

  return (
    <footer className={cn("border-t", className)}>
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              {isMounted && brandLogo ? (
                <Image
                  src={brandLogo}
                  alt={brandName}
                  width={120}
                  height={32}
                  className="h-8 w-auto object-contain"
                />
              ) : (
                brandName
              )}
            </Link>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              {brandDescription}
            </p>
            <div className="mt-4 flex items-center gap-2">
              {socialLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={item.label}
                  className="flex size-9 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>

          {footerNav.map((section) => (
            <div key={section.key}>
              <h3 className="text-sm font-medium">{t(section.key as Parameters<typeof t>[0])}</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.key ? t(item.key as Parameters<typeof t>[0]) : item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t pt-6 text-xs text-muted-foreground md:flex-row">
          <p>
            &copy; {new Date().getFullYear()} {brandName}. {t("copyright")}
          </p>
          <p>
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="hover:text-foreground"
            >
              {siteConfig.contactEmail}
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
