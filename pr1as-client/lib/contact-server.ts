import "server-only"

import {
  buildEmptyContactContent,
  normalizeContactContent,
  type ContactContent,
} from "@/services/contact.service"

/**
 * Server-side fetch of the editable Contact content for SSR. Revalidates every
 * 60s. On any failure returns an empty shape so the page can still render.
 */
export async function getServerContactContent(): Promise<ContactContent> {
  try {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3052/api"
    const res = await fetch(`${apiBase}/contact`, { next: { revalidate: 60 } })
    if (!res.ok) return buildEmptyContactContent()
    const json = (await res.json()) as { data?: unknown }
    return normalizeContactContent(json.data)
  } catch {
    return buildEmptyContactContent()
  }
}
