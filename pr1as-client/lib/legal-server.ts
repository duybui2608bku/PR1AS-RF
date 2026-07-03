import "server-only"

import {
  buildEmptyLegalContent,
  normalizeLegalContent,
  type LegalContent,
  type LegalPageKey,
} from "@/services/legal.service"

/**
 * Server-side fetch of the editable legal content for SSR. Revalidates every
 * 60s. On any failure returns an empty shape (no sections) so the page falls
 * back to the next-intl legal messages (current behaviour preserved).
 */
export async function getServerLegalContent(
  page: LegalPageKey
): Promise<LegalContent> {
  try {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3052/api"
    const res = await fetch(`${apiBase}/legal/${page}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return buildEmptyLegalContent()
    const json = (await res.json()) as { data?: unknown }
    return normalizeLegalContent(json.data)
  } catch {
    return buildEmptyLegalContent()
  }
}
