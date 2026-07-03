import { api } from "@/lib/axios"

export interface LocalizedText {
  vi: string
  en: string
  zh: string
  ko: string
}

export type LegalPageKey = "privacy" | "terms"

export interface LegalSection {
  title: LocalizedText
  /** Rich-text HTML per locale. */
  body: LocalizedText
}

export interface LegalContent {
  title: LocalizedText
  lastUpdated: LocalizedText
  /** Optional rich-text intro shown above the sections. */
  intro: LocalizedText
  sections: LegalSection[]
}

/** A partial update — each provided field carries fully-formed locale maps. */
export type LegalContentPatch = Partial<LegalContent>

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

function locSections(value: unknown): LegalSection[] {
  if (!Array.isArray(value)) return []
  return value.map((raw) => {
    const section = (raw ?? {}) as Partial<LegalSection>
    return { title: loc(section.title), body: loc(section.body) }
  })
}

/**
 * Empty structural shape. Used only when the API is unreachable; the public
 * page falls back to next-intl legal messages when there are no sections.
 */
export function buildEmptyLegalContent(): LegalContent {
  return {
    title: { ...EMPTY_LOCALIZED },
    lastUpdated: { ...EMPTY_LOCALIZED },
    intro: { ...EMPTY_LOCALIZED },
    sections: [],
  }
}

/** Defensively coerce an API payload into a complete LegalContent shape. */
export function normalizeLegalContent(raw: unknown): LegalContent {
  const d = (raw ?? {}) as Record<string, unknown>
  return {
    title: loc(d.title),
    lastUpdated: loc(d.lastUpdated),
    intro: loc(d.intro),
    sections: locSections(d.sections),
  }
}

async function get(page: LegalPageKey): Promise<LegalContent> {
  try {
    const res = await api.get<ApiResponse<LegalContent>>(`/legal/${page}`)
    return normalizeLegalContent(res.data.data)
  } catch {
    return buildEmptyLegalContent()
  }
}

async function save(
  page: LegalPageKey,
  patch: LegalContentPatch
): Promise<LegalContent> {
  const res = await api.patch<ApiResponse<LegalContent>>(`/legal/${page}`, patch)
  return normalizeLegalContent(res.data.data)
}

async function reset(page: LegalPageKey): Promise<LegalContent> {
  const res = await api.post<ApiResponse<LegalContent>>(`/legal/${page}/reset`)
  return normalizeLegalContent(res.data.data)
}

export const legalService = { get, save, reset }
