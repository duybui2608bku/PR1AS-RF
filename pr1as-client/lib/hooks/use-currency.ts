"use client"

import * as React from "react"
import { useLocale } from "next-intl"

import { useCurrencyStore } from "@/lib/store/currency-store"
import {
  formatMoney,
  getCurrencyMeta,
  INTL_LOCALE_TAG_FALLBACK,
} from "@/lib/currency"
import { INTL_LOCALE_TAGS, type SupportedLocale } from "@/lib/locale"

/**
 * Selected display currency + a `format` helper bound to it.
 * `format(amountVnd)` renders a VND base amount in the chosen currency.
 */
export function useCurrency() {
  const locale = useLocale() as SupportedLocale
  const localeTag = INTL_LOCALE_TAGS[locale] ?? INTL_LOCALE_TAG_FALLBACK
  const currency = useCurrencyStore((s) => s.currency)
  const setCurrency = useCurrencyStore((s) => s.setCurrency)

  const format = React.useCallback(
    (amountVnd: number | null | undefined) =>
      formatMoney(amountVnd, currency, localeTag),
    [currency, localeTag]
  )

  return {
    currency,
    setCurrency,
    meta: getCurrencyMeta(currency),
    localeTag,
    format,
  }
}
