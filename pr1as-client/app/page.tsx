import { redirect, permanentRedirect } from "next/navigation"

import type { HomeSearchParams } from "@/lib/home/home-search-params"

type RootPageProps = {
  searchParams: Promise<HomeSearchParams>
}

const buildSearchString = (raw: HomeSearchParams): string => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(raw)) {
    if (value == null) continue
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item)
    } else {
      params.set(key, value)
    }
  }
  return params.toString()
}

export default async function RootPage({ searchParams }: RootPageProps) {
  const raw = await searchParams
  const queryString = buildSearchString(raw)
  const target = queryString ? `/services?${queryString}` : "/services"
  // permanent redirect (308) so search engines / browsers cache the canonical
  // route. If a query string is present we use a temporary redirect (307)
  // because the destination URL depends on user input.
  if (queryString) {
    redirect(target)
  }
  permanentRedirect(target)
}
