"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { AtSign, Camera, Music2, Share2 } from "lucide-react"

import { siteConfig } from "@/config/site"
import { footerNav } from "@/config/nav"
import { cn } from "@/lib/utils"

const socialLinks = [
  {
    label: "Facebook",
    href: siteConfig.links.facebook,
    icon: <Share2 aria-hidden="true" className="size-4" />,
  },
  {
    label: "TikTok",
    href: siteConfig.links.tiktok,
    icon: <Music2 aria-hidden="true" className="size-4" />,
  },
  {
    label: "Threads",
    href: siteConfig.links.thread,
    icon: <AtSign aria-hidden="true" className="size-4" />,
  },
  {
    label: "Instagram",
    href: siteConfig.links.instagram,
    icon: <Camera aria-hidden="true" className="size-4" />,
  },
] as const

export function SiteFooter({ className }: { className?: string }) {
  const t = useTranslations("Footer")

  return (
    <footer className={cn("border-t", className)}>
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="font-semibold">
              {siteConfig.name}
            </Link>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              {siteConfig.description}
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
            &copy; {new Date().getFullYear()} {siteConfig.name}. {t("copyright")}
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
