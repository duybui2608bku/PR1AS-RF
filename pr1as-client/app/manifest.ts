import type { MetadataRoute } from "next"
import { getLocale, getTranslations } from "next-intl/server"

import { siteConfig } from "@/config/site"
import {
  DEFAULT_LOCALE,
  INTL_LOCALE_TAGS,
  type SupportedLocale,
} from "@/lib/locale"


export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("SEO"),
  ])
  const lang =
    INTL_LOCALE_TAGS[locale as SupportedLocale] ?? INTL_LOCALE_TAGS[DEFAULT_LOCALE]

  return {
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: t("appDescription"),
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang,
    categories: ["business", "productivity", "shopping"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  }
}
