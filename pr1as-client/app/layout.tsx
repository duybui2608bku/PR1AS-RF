import type { Metadata, Viewport } from "next"
import { Montserrat, Geist_Mono } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages } from "next-intl/server"

import "./globals.css"
import { Providers } from "@/components/providers"
import { siteConfig } from "@/config/site"
import { defaultKeywords } from "@/lib/seo"
import { getServerSiteSettings } from "@/lib/site-settings-server"
import { cn } from "@/lib/utils"

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-sans" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getServerSiteSettings()

  const name = settings.name || siteConfig.name
  const description = settings.description || siteConfig.description
  const siteUrl = settings.siteUrl || siteConfig.url
  const favicon = settings.faviconUrl || "/favicon.ico"
  const ogImage = settings.ogImageUrl || siteConfig.ogImage
  const keywords = settings.keywords
    ? settings.keywords.split(",").map((k) => k.trim()).filter(Boolean)
    : defaultKeywords

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
      locale: "vi_VN",
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
