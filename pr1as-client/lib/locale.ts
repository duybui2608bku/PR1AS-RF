export const SUPPORTED_LOCALES = ["vi", "en", "zh", "ko"] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: SupportedLocale = "vi"
export const LOCALE_COOKIE_NAME = "NEXT_LOCALE"
export const LOCALE_STORAGE_KEY = "pr1as-locale"

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  vi: "Tiếng Việt",
  en: "English",
  zh: "中文",
  ko: "한국어",
}

/** BCP-47 tags for Intl APIs (date/number formatting). */
export const INTL_LOCALE_TAGS: Record<SupportedLocale, string> = {
  vi: "vi-VN",
  en: "en-US",
  zh: "zh-CN",
  ko: "ko-KR",
}

/** A multilingual string as returned by the API (may include locales we don't UI-switch, e.g. ko). */
export type LocalizedText = {
  en?: string | null
  vi?: string | null
  zh?: string | null
  ko?: string | null
}

/** Fallback chain per active locale: preferred locale first, then the rest. */
const LOCALE_FALLBACK_ORDER: Record<SupportedLocale, (keyof LocalizedText)[]> = {
  vi: ["vi", "en", "zh", "ko"],
  en: ["en", "vi", "zh", "ko"],
  zh: ["zh", "vi", "en", "ko"],
  ko: ["ko", "en", "vi", "zh"],
}

/**
 * Pick the best string from a multilingual field for the given locale, falling
 * back through the other locales when the preferred one is missing/empty.
 */
export function pickLocalized(
  text: LocalizedText | null | undefined,
  locale: string
): string | null {
  if (!text) return null
  const order =
    LOCALE_FALLBACK_ORDER[locale as SupportedLocale] ??
    LOCALE_FALLBACK_ORDER[DEFAULT_LOCALE]
  for (const key of order) {
    const value = text[key]
    if (value != null && String(value).trim() !== "") return value
  }
  return null
}
