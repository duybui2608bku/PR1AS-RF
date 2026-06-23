import type { Metadata } from "next"
import { getLocale, getTranslations } from "next-intl/server"

import { siteConfig } from "@/config/site"
import { DEFAULT_LOCALE, type SupportedLocale } from "@/lib/locale"

type PageMetadataInput = {
  title: string
  description: string
  path: `/${string}`
  images?: string[]
  noIndex?: boolean
}

/** OpenGraph locale tags (underscored, e.g. vi_VN) per UI locale. */
export const OG_LOCALE_TAGS: Record<SupportedLocale, string> = {
  vi: "vi_VN",
  en: "en_US",
  zh: "zh_CN",
  ko: "ko_KR",
}

/** Fallback keywords used when the SEO translations are unavailable. */
export const defaultKeywords = [
  "PR1AS",
  "service booking",
  "freelancers",
  "online booking",
  "worker marketplace",
]

const noIndexRobots: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
}

export const privateRouteMetadata: Metadata = {
  robots: noIndexRobots,
}

export function getAbsoluteUrl(path: `/${string}` = "/") {
  return new URL(path, siteConfig.url).toString()
}

/** Resolve the active UI locale, falling back to the default when unsupported. */
async function getSeoLocale(): Promise<SupportedLocale> {
  const locale = await getLocale()
  return locale in OG_LOCALE_TAGS ? (locale as SupportedLocale) : DEFAULT_LOCALE
}

/** Keywords for the active locale, read from the SEO translations. */
export async function getLocalizedKeywords(): Promise<string[]> {
  const t = await getTranslations("SEO")
  const raw = t("keywords")
  const keywords = raw
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean)
  return keywords.length > 0 ? keywords : defaultKeywords
}

export async function createPageMetadata({
  title,
  description,
  path,
  images = [siteConfig.ogImage],
  noIndex = false,
}: PageMetadataInput): Promise<Metadata> {
  const url = getAbsoluteUrl(path)
  const locale = await getSeoLocale()
  const keywords = await getLocalizedKeywords()

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      images: images.map((image) => ({ url: image })),
      locale: OG_LOCALE_TAGS[locale],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
    robots: noIndex ? noIndexRobots : undefined,
  }
}
