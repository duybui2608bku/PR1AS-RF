import { create } from "zustand"

import {
  CURRENCY_COOKIE_NAME,
  CURRENCY_STORAGE_KEY,
  DEFAULT_CURRENCY,
  isSupportedCurrency,
  readStoredCurrency,
  type CurrencyCode,
} from "@/lib/currency"

type CurrencyState = {
  currency: CurrencyCode
  /** True once the persisted preference has been read on the client. */
  hydrated: boolean
  setCurrency: (currency: CurrencyCode) => void
  /** Read cookie/localStorage on the client and apply it (run once on mount). */
  hydrate: () => void
}

const persist = (currency: CurrencyCode) => {
  if (typeof document !== "undefined") {
    document.cookie = `${CURRENCY_COOKIE_NAME}=${currency}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
  }
  try {
    localStorage.setItem(CURRENCY_STORAGE_KEY, currency)
  } catch {
    // localStorage may be unavailable (private browsing) — cookie still set.
  }
}

// Init to DEFAULT on both server and client so the first client render matches
// the server HTML (no hydration mismatch); the real preference is applied via
// hydrate() in an effect after mount.
export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  currency: DEFAULT_CURRENCY,
  hydrated: false,
  setCurrency: (currency) => {
    if (!isSupportedCurrency(currency) || currency === get().currency) return
    persist(currency)
    set({ currency })
  },
  hydrate: () => {
    if (get().hydrated) return
    const stored = readStoredCurrency()
    set({ currency: stored, hydrated: true })
  },
}))
