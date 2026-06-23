"use client"

import { useLocale } from "next-intl"
import { useRouter } from "next/navigation"

import { useCurrency } from "@/lib/hooks/use-currency"
import { usePrefLoadingStore } from "@/lib/store/pref-loading-store"
import { useAuthStore } from "@/lib/store/auth-store"
import { authService } from "@/services/auth.service"
import {
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  type SupportedLocale,
} from "@/lib/locale"
import type { CurrencyCode } from "@/lib/currency"

/** Currency switch is instant (client reformat); show the overlay briefly so the
 *  change is perceivable instead of flickering. */
const CURRENCY_FEEDBACK_MS = 450

/**
 * Single source of truth for changing the display language or currency, with a
 * global loading overlay. Replaces the per-component handlers that used to be
 * duplicated across the header switchers and the mobile prefs sheet.
 *
 * - Locale: persist cookie/localStorage (+ best-effort user record) then
 *   `router.refresh()`. The overlay is cleared by `PrefLoadingOverlay` once the
 *   server re-render swaps the active locale.
 * - Currency: update the store immediately, then drop the overlay after a short
 *   feedback delay.
 */
export function usePrefSwitch() {
  const router = useRouter()
  const currentLocale = useLocale() as SupportedLocale
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { currency, setCurrency } = useCurrency()
  const start = usePrefLoadingStore((s) => s.start)
  const stop = usePrefLoadingStore((s) => s.stop)

  const changeLocale = (locale: SupportedLocale) => {
    if (locale === currentLocale) return
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    } catch {
      // localStorage may be unavailable (e.g. private browsing)
    }
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    // Persist on the user record (best-effort) so emails match the chosen
    // language. Anonymous visitors only get the cookie.
    if (isAuthenticated) {
      authService.updateLocale(locale).catch(() => {
        // non-blocking: the UI language still switches via cookie + refresh
      })
    }
    start("locale")
    router.refresh()
  }

  const changeCurrency = (code: CurrencyCode) => {
    if (code === currency) return
    start("currency")
    setCurrency(code)
    window.setTimeout(stop, CURRENCY_FEEDBACK_MS)
  }

  return { currentLocale, currency, changeLocale, changeCurrency }
}
