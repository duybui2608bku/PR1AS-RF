import type { Metadata, Viewport } from "next"
import { Montserrat, Geist_Mono } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages, getTranslations } from "next-intl/server"

import "./globals.css"
import { Providers } from "@/components/providers"
import { siteConfig } from "@/config/site"
import { OG_LOCALE_TAGS, getLocalizedKeywords } from "@/lib/seo"
import { DEFAULT_LOCALE, pickLocalized, type SupportedLocale } from "@/lib/locale"
import { getServerSiteSettings } from "@/lib/site-settings-server"
import { cn } from "@/lib/utils"

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-sans" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export async function generateMetadata(): Promise<Metadata> {
  const [settings, locale, localizedKeywords, t] = await Promise.all([
    getServerSiteSettings(),
    getLocale(),
    getLocalizedKeywords(),
    getTranslations("SEO"),
  ])

  const ogLocale =
    OG_LOCALE_TAGS[locale as SupportedLocale] ?? OG_LOCALE_TAGS[DEFAULT_LOCALE]
  const name = settings.name || siteConfig.name
  const description =
    pickLocalized(settings.description, locale) || t("appDescription")
  const siteUrl = settings.siteUrl || siteConfig.url
  const favicon = settings.faviconUrl || "/favicon.ico"
  const ogImage = settings.ogImageUrl || siteConfig.ogImage
  const settingsKeywords = pickLocalized(settings.keywords, locale)
  const keywords = settingsKeywords
    ? settingsKeywords.split(",").map((k) => k.trim()).filter(Boolean)
    : localizedKeywords

  return {
    title: {
      default: name,
      template: `%s | ${name}`,
    },
    description,
    applicationName: name,
    keywords,
    authors: [{ name }],
    creator: name,
    publisher: name,
    category: "service marketplace",
    metadataBase: new URL(siteUrl),
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: name,
      statusBarStyle: "default",
    },
    openGraph: {
      title: name,
      description,
      url: siteUrl,
      siteName: name,
      images: [{ url: ogImage }],
      locale: ogLocale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description,
      images: [ogImage],
      ...(settings.twitterHandle ? { creator: settings.twitterHandle } : {}),
    },
    icons: {
      icon: favicon,
      shortcut: favicon,
      apple: favicon,
    },
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 1,
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()])
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", montserrat.variable)}
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
