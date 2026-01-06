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
  formatCurrency: (amount: number) => string;
}

/**
 * Currency Store với Zustand
 * Quản lý loại tiền tệ
 */
export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => {
      return {
        // Initial state - mặc định là USD
        currency: "USD" as Currency,

        // Set currency
        setCurrency: (currency: Currency) => {
          set({ currency });
        },

        formatCurrency: (amount: number) => {
          const currencySymbols: Record<Currency, string> = {
            USD: "$",
            VND: "₫",
            EUR: "€",
            KRW: "₩",
            CNY: "¥",
          };

          const currency = get().currency;
          const symbol = currencySymbols[currency];
          
          const isVND = currency === "VND";
          const formattedAmount = new Intl.NumberFormat("en-US", {
            minimumFractionDigits: isVND ? 0 : 2,
            maximumFractionDigits: isVND ? 0 : 2,
          }).format(amount);

          return `${symbol}${formattedAmount}`;
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

