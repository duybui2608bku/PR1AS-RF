import type { Metadata } from "next"

import { siteConfig } from "@/config/site"

type PageMetadataInput = {
  title: string
  description: string
  path: `/${string}`
  images?: string[]
  noIndex?: boolean
}

export const defaultKeywords = [
  "PR1AS",
  "booking dịch vụ",
  "freelancer Việt Nam",
  "đặt lịch dịch vụ",
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

export function createPageMetadata({
  title,
  description,
  path,
  images = [siteConfig.ogImage],
  noIndex = false,
}: PageMetadataInput): Metadata {
  const url = getAbsoluteUrl(path)

  return {
    title,
    description,
    keywords: defaultKeywords,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: siteConfig.name,
      images: images.map((image) => ({ url: image })),
      locale: "vi_VN",
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
