import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Currency = "USD" | "VND" | "EUR" | "KRW" | "CNY";

export const DEFAULT_CURRENCY: Currency = "VND";
export const MULTI_CURRENCY_ENABLED = false;
export const SUPPORTED_CURRENCIES: Currency[] = [
  "USD",
  "VND",
  "EUR",
  "KRW",
  "CNY",
];
export const CURRENCIES: Currency[] = MULTI_CURRENCY_ENABLED
  ? SUPPORTED_CURRENCIES
  : [DEFAULT_CURRENCY];

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: "USD ($)",
  VND: "VND (₫)",
  EUR: "EUR (€)",
  KRW: "KRW (₩)",
  CNY: "CNY (¥)",
};

interface CurrencyState {
  currency: Currency;
  hasUserSelectedCurrency: boolean;
  setCurrency: (currency: Currency) => void;
  initializeCurrency: () => void;
  formatCurrency: (
    amount: number,
    customCurrency?: Currency | string,
  ) => string;
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: DEFAULT_CURRENCY,
      hasUserSelectedCurrency: false,

      setCurrency: (currency: Currency) => {
        void currency;
        set({ currency: DEFAULT_CURRENCY, hasUserSelectedCurrency: false });
      },

      initializeCurrency: () => {
        set({ currency: DEFAULT_CURRENCY, hasUserSelectedCurrency: false });
      },

      formatCurrency: (amount: number, customCurrency?: Currency | string) => {
        void customCurrency;
        return new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: DEFAULT_CURRENCY,
          maximumFractionDigits: 0,
        }).format(amount);
      },
    }),
    {
      name: "currency-storage",
      partialize: () => ({
        currency: DEFAULT_CURRENCY,
        hasUserSelectedCurrency: false,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            state.currency = DEFAULT_CURRENCY;
            state.hasUserSelectedCurrency = false;
          }
        };
      },
    },
  ),
);
