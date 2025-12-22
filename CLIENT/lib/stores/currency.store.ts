import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Currency = "USD" | "VND" | "EUR" | "KRW" | "CNY";

export const CURRENCIES: Currency[] = ["USD", "VND", "EUR", "KRW", "CNY"];

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: "USD ($)",
  VND: "VND (₫)",
  EUR: "EUR (€)",
  KRW: "KRW (₩)",
  CNY: "CNY (¥)",
};

/**
 * Currency State Interface
 */
interface CurrencyState {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

/**
 * Currency Store với Zustand
 * Quản lý loại tiền tệ
 */
export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => {
      return {
        // Initial state - mặc định là USD
        currency: "USD" as Currency,

        // Set currency
        setCurrency: (currency: Currency) => {
          set({ currency });
        },
      };
    },
    {
      name: "currency-storage", // Tên key trong localStorage
      partialize: (state) => ({
        currency: state.currency,
      }),
    }
  )
);

