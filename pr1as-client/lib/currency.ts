/**
 * Multi-currency support (frontend).
 *
 * VND is the pivot/base currency. Every amount the app holds is in VND; the
 * display layer converts to the user's selected currency via the rate table
 * below. These rates MUST stay in sync with the backend source of truth at
 * `SERVER/src/constants/currency.ts` — only the backend value is persisted.
 */

export const SUPPORTED_CURRENCIES = ["VND", "CNY", "JPY", "KRW", "USD"] as const
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]

export const DEFAULT_CURRENCY: CurrencyCode = "VND"
export const CURRENCY_COOKIE_NAME = "pr1as-currency"
export const CURRENCY_STORAGE_KEY = "pr1as-currency"
export const INTL_LOCALE_TAG_FALLBACK = "vi-VN"

export type CurrencyMeta = {
  code: CurrencyCode
  /** Localised label shown in the picker. */
  label: string
  flag: string
  symbol: string
  /** Fraction digits for input + display. */
  decimals: number
  /** How many VND one unit of this currency is worth (snapshot). */
  rateToVnd: number
}

export const CURRENCY_META: Record<CurrencyCode, CurrencyMeta> = {
  VND: { code: "VND", label: "VND – Việt Nam", flag: "🇻🇳", symbol: "₫", decimals: 0, rateToVnd: 1 },
  CNY: { code: "CNY", label: "CNY – Trung Quốc", flag: "🇨🇳", symbol: "¥", decimals: 2, rateToVnd: 3900 },
  JPY: { code: "JPY", label: "JPY – Nhật Bản", flag: "🇯🇵", symbol: "¥", decimals: 0, rateToVnd: 165 },
  KRW: { code: "KRW", label: "KRW – Hàn Quốc", flag: "🇰🇷", symbol: "₩", decimals: 0, rateToVnd: 17 },
  USD: { code: "USD", label: "USD – Mỹ", flag: "🇺🇸", symbol: "$", decimals: 2, rateToVnd: 26000 },
}

export function isSupportedCurrency(value: unknown): value is CurrencyCode {
  return (
    typeof value === "string" &&
    (SUPPORTED_CURRENCIES as readonly string[]).includes(value)
  )
}

export function getCurrencyMeta(currency: string): CurrencyMeta {
  return isSupportedCurrency(currency)
    ? CURRENCY_META[currency]
    : CURRENCY_META[DEFAULT_CURRENCY]
}

/** Convert an amount in VND to the given currency. */
export function convertVndTo(amountVnd: number, currency: string): number {
  return amountVnd / getCurrencyMeta(currency).rateToVnd
}

/** Convert an amount in the given currency back to VND. */
export function convertToVnd(amount: number, currency: string): number {
  return Math.round(amount * getCurrencyMeta(currency).rateToVnd)
}

/**
 * Format a VND base amount in the chosen display currency.
 * `localeTag` controls grouping/decimal separators (BCP-47).
 */
export function formatMoney(
  amountVnd: number | null | undefined,
  currency: string = DEFAULT_CURRENCY,
  localeTag: string = "vi-VN"
): string {
  const meta = getCurrencyMeta(currency)
  const value = convertVndTo(Number(amountVnd ?? 0), meta.code)
  return new Intl.NumberFormat(localeTag, {
    style: "currency",
    currency: meta.code,
    maximumFractionDigits: meta.decimals,
    minimumFractionDigits: 0,
  }).format(value)
}

/**
 * Parse a price typed into an input (in the given currency). Integer-only for
 * 0-decimal currencies; allows one decimal separator otherwise.
 */
export function parseAmountInput(
  value: string,
  decimals: number
): number | undefined {
  if (decimals === 0) {
    const digits = value.replace(/[^\d]/g, "")
    if (!digits) return undefined
    const amount = Number(digits)
    return Number.isFinite(amount) && amount > 0 ? amount : undefined
  }
  const cleaned = value.replace(/[^\d.,]/g, "").replace(/,/g, ".")
  const dot = cleaned.indexOf(".")
  const normalized =
    dot === -1
      ? cleaned
      : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "")
  if (!normalized || normalized === ".") return undefined
  const amount = Number(normalized)
  return Number.isFinite(amount) && amount > 0 ? amount : undefined
}

/** Format a number for display inside a price input (grouping + decimals). */
export function formatAmountInput(
  value: number | string | undefined,
  localeTag: string,
  decimals: number
): string {
  const raw = String(value ?? "")
  if (raw === "") return ""
  if (decimals === 0) {
    const digits = raw.replace(/[^\d]/g, "")
    if (!digits) return ""
    return new Intl.NumberFormat(localeTag).format(Number(digits))
  }
  const cleaned = raw.replace(/[^\d.,]/g, "").replace(/,/g, ".")
  const dot = cleaned.indexOf(".")
  const intDigits = (dot === -1 ? cleaned : cleaned.slice(0, dot)).replace(/[^\d]/g, "")
  const grouped = intDigits
    ? new Intl.NumberFormat(localeTag).format(Number(intDigits))
    : dot === -1
      ? ""
      : "0"
  if (dot === -1) return grouped
  const fracDigits = cleaned.slice(dot + 1).replace(/[^\d]/g, "").slice(0, decimals)
  return `${grouped}.${fracDigits}`
}

/** True if the user has explicitly chosen a currency (cookie or localStorage). */
export function hasStoredCurrency(): boolean {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${CURRENCY_COOKIE_NAME}=([^;]*)`)
    )
    if (match && isSupportedCurrency(match[1])) return true
  }
  if (typeof localStorage !== "undefined") {
    if (isSupportedCurrency(localStorage.getItem(CURRENCY_STORAGE_KEY))) return true
  }
  return false
}

/** Read the persisted currency synchronously (cookie → localStorage → default). */
export function readStoredCurrency(): CurrencyCode {
  if (typeof document !== "undefined") {
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${CURRENCY_COOKIE_NAME}=([^;]*)`)
    )
    if (match && isSupportedCurrency(match[1])) return match[1]
  }
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY)
    if (isSupportedCurrency(stored)) return stored
  }
  return DEFAULT_CURRENCY
}
