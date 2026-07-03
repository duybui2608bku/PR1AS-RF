import { api } from "@/lib/axios"

export interface LocalizedText {
  vi: string
  en: string
  zh: string
  ko: string
}

export interface ContactContent {
  title: LocalizedText
  subtitle: LocalizedText
  /** Plain contact channels — not localized. */
  email: string
  phone: string
  address: LocalizedText
  hours: LocalizedText
  /** Rich-text HTML per locale. */
  body: LocalizedText
}

/** A partial update — provided fields carry fully-formed locale maps / scalars. */
export type ContactContentPatch = Partial<ContactContent>

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

function str(value: unknown): string {
  return typeof value === "string" ? value : ""
}

/**
 * Empty structural shape. Used only when the API is unreachable so the public
 * page can still render its labels and fall back gracefully.
 */
export function buildEmptyContactContent(): ContactContent {
  return {
    title: { ...EMPTY_LOCALIZED },
    subtitle: { ...EMPTY_LOCALIZED },
    email: "",
    phone: "",
    address: { ...EMPTY_LOCALIZED },
    hours: { ...EMPTY_LOCALIZED },
    body: { ...EMPTY_LOCALIZED },
  }
}

/** Defensively coerce an API payload into a complete ContactContent shape. */
export function normalizeContactContent(raw: unknown): ContactContent {
  const d = (raw ?? {}) as Record<string, unknown>
  return {
    title: loc(d.title),
    subtitle: loc(d.subtitle),
    email: str(d.email),
    phone: str(d.phone),
    address: loc(d.address),
    hours: loc(d.hours),
    body: loc(d.body),
  }
}

async function get(): Promise<ContactContent> {
  try {
    const res = await api.get<ApiResponse<ContactContent>>("/contact")
    return normalizeContactContent(res.data.data)
  } catch {
    return buildEmptyContactContent()
  }
}

async function save(patch: ContactContentPatch): Promise<ContactContent> {
  const res = await api.patch<ApiResponse<ContactContent>>("/contact", patch)
  return normalizeContactContent(res.data.data)
}

async function reset(): Promise<ContactContent> {
  const res = await api.post<ApiResponse<ContactContent>>("/contact/reset")
  return normalizeContactContent(res.data.data)
}

export const contactService = { get, save, reset }
