"use client";

import { useCurrencyStore, CURRENCIES, CURRENCY_LABELS, type Currency } from "../stores/currency.store";
import { useEffect } from "react";

/**
 * Hook để sử dụng currency
 */
export function useCurrency() {
  const { currency, setCurrency, initializeCurrency } = useCurrencyStore();

  useEffect(() => {
    initializeCurrency();
  }, [initializeCurrency]);

  return {
    currency,
    setCurrency,
    currencies: CURRENCIES,
    getCurrencyLabel: (curr: Currency) => CURRENCY_LABELS[curr],
  };
}

