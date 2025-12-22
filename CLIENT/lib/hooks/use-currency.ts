"use client";

import { useCurrencyStore, CURRENCIES, CURRENCY_LABELS, type Currency } from "../stores/currency.store";

/**
 * Hook để sử dụng currency
 */
export function useCurrency() {
  const { currency, setCurrency } = useCurrencyStore();

  return {
    currency,
    setCurrency,
    currencies: CURRENCIES,
    getCurrencyLabel: (curr: Currency) => CURRENCY_LABELS[curr],
  };
}

