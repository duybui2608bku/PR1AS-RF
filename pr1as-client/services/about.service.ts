import { api } from "@/lib/axios"

export interface LocalizedText {
  vi: string
  en: string
  zh: string
  ko: string
}

export interface AboutItem {
  title: LocalizedText
  description: LocalizedText
}

export interface AboutContent {
  hero: {
    badge: LocalizedText
    title: LocalizedText
    subtitle: LocalizedText
  }
  what: {
    title: LocalizedText
    tagline: LocalizedText
    /** Rich-text HTML per locale. */
    body: LocalizedText
  }
  why: {
    title: LocalizedText
    subtitle: LocalizedText
    items: AboutItem[]
  }
  features: {
    title: LocalizedText
    subtitle: LocalizedText
    items: AboutItem[]
  }
  cta: {
    title: LocalizedText
    subtitle: LocalizedText
    primary: LocalizedText
    secondary: LocalizedText
  }
}

/** A partial update — each provided section carries fully-formed locale maps. */
export type AboutContentPatch = Partial<AboutContent>

interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
}

export const EMPTY_LOCALIZED: LocalizedText = { vi: "", en: "", zh: "", ko: "" }

function loc(value: unknown): LocalizedText {
  if (value && typeof value === "object") {
    return { ...EMPTY_LOCALIZED, ...(value as Partial<LocalizedText>) }
  }
  if (typeof value === "string") return { ...EMPTY_LOCALIZED, vi: value }
  return { ...EMPTY_LOCALIZED }
}

function locItems(value: unknown): AboutItem[] {
  if (!Array.isArray(value)) return []
  return value.map((raw) => {
    const item = (raw ?? {}) as Partial<AboutItem>
    return { title: loc(item.title), description: loc(item.description) }
  })
}

/**
 * Empty structural shape. Used only when the API is unreachable; the public
 * page falls back to next-intl `About` messages for any blank field.
 */
export function buildEmptyAboutContent(): AboutContent {
  return {
    hero: {
      badge: { ...EMPTY_LOCALIZED },
      title: { ...EMPTY_LOCALIZED },
      subtitle: { ...EMPTY_LOCALIZED },
    },
    what: {
      title: { ...EMPTY_LOCALIZED },
      tagline: { ...EMPTY_LOCALIZED },
      body: { ...EMPTY_LOCALIZED },
    },
    why: {
      title: { ...EMPTY_LOCALIZED },
      subtitle: { ...EMPTY_LOCALIZED },
      items: [],
    },
    features: {
      title: { ...EMPTY_LOCALIZED },
      subtitle: { ...EMPTY_LOCALIZED },
      items: [],
    },
    cta: {
      title: { ...EMPTY_LOCALIZED },
      subtitle: { ...EMPTY_LOCALIZED },
      primary: { ...EMPTY_LOCALIZED },
      secondary: { ...EMPTY_LOCALIZED },
    },
  }
}

/** Defensively coerce an API payload into a complete AboutContent shape. */
export function normalizeAboutContent(raw: unknown): AboutContent {
  const d = (raw ?? {}) as Record<string, Record<string, unknown>>
  const hero = d.hero ?? {}
  const what = d.what ?? {}
  const why = d.why ?? {}
  const features = d.features ?? {}
  const cta = d.cta ?? {}
  return {
    hero: {
      badge: loc(hero.badge),
      title: loc(hero.title),
      subtitle: loc(hero.subtitle),
    },
    what: {
      title: loc(what.title),
      tagline: loc(what.tagline),
      body: loc(what.body),
    },
    why: {
      title: loc(why.title),
      subtitle: loc(why.subtitle),
      items: locItems(why.items),
    },
    features: {
      title: loc(features.title),
      subtitle: loc(features.subtitle),
      items: locItems(features.items),
    },
    cta: {
      title: loc(cta.title),
      subtitle: loc(cta.subtitle),
      primary: loc(cta.primary),
      secondary: loc(cta.secondary),
    },
  }
}

async function get(): Promise<AboutContent> {
  try {
    const res = await api.get<ApiResponse<AboutContent>>("/about")
    return normalizeAboutContent(res.data.data)
  } catch {
    return buildEmptyAboutContent()
  }
}

async function save(patch: AboutContentPatch): Promise<AboutContent> {
  const res = await api.patch<ApiResponse<AboutContent>>("/about", patch)
  return normalizeAboutContent(res.data.data)
}

async function reset(): Promise<AboutContent> {
  const res = await api.post<ApiResponse<AboutContent>>("/about/reset")
  return normalizeAboutContent(res.data.data)
}

export const aboutService = { get, save, reset }
