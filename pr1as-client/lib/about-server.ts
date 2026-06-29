import "server-only"

import {
  buildEmptyAboutContent,
  normalizeAboutContent,
  type AboutContent,
} from "@/services/about.service"

/**
 * Server-side fetch of the editable About content for SSR. Revalidates every
 * 60s. On any failure returns an empty shape so the page falls back to the
 * next-intl `About` messages per field (current behaviour preserved).
 */
export async function getServerAboutContent(): Promise<AboutContent> {
  try {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3052/api"
    const res = await fetch(`${apiBase}/about`, { next: { revalidate: 60 } })
    if (!res.ok) return buildEmptyAboutContent()
    const json = (await res.json()) as { data?: unknown }
    return normalizeAboutContent(json.data)
  } catch {
    return buildEmptyAboutContent()
  }
}
