export const SUPPORTED_LOCALES = ["vi", "en", "zh"] as const
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: SupportedLocale = "vi"
export const LOCALE_COOKIE_NAME = "NEXT_LOCALE"
export const LOCALE_STORAGE_KEY = "pr1as-locale"

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  vi: "Tiếng Việt",
  en: "English",
  zh: "中文",
}
