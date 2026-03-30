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

const isSupportedCurrency = (value: unknown): value is Currency =>
  typeof value === "string" && CURRENCIES.includes(value as Currency);

/**
 * Currency State Interface
 */
interface CurrencyState {
  currency: Currency;
  hasUserSelectedCurrency: boolean;
  setCurrency: (currency: Currency) => void;
  initializeCurrency: () => void;
  formatCurrency: (amount: number, customCurrency?: Currency | string) => string;
}

/**
 * Currency Store với Zustand
 * Quản lý loại tiền tệ
 */
export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => {
      const countryToCurrency: Record<string, Currency> = {
        VN: "VND",
        KR: "KRW",
        CN: "CNY",
        AT: "EUR",
        BE: "EUR",
        CY: "EUR",
        EE: "EUR",
        FI: "EUR",
        FR: "EUR",
        DE: "EUR",
        GR: "EUR",
        IE: "EUR",
        IT: "EUR",
        LV: "EUR",
        LT: "EUR",
        LU: "EUR",
        MT: "EUR",
        NL: "EUR",
        PT: "EUR",
        SK: "EUR",
        SI: "EUR",
        ES: "EUR",
      };

      const detectCurrencyFromBrowser = (): Currency => {
        if (typeof window === "undefined") {
          return "USD";
        }

        const browserLocales = navigator.languages?.length
          ? navigator.languages
          : [navigator.language];

        for (const locale of browserLocales) {
          try {
            const region = new Intl.Locale(locale).region;
            if (region && countryToCurrency[region]) {
              return countryToCurrency[region];
            }
          } catch {
            // Ignore invalid locale values and continue with fallback strategy.
          }
        }

        // Fallback by language when region is missing (e.g. "vi", "ko", "zh")
        for (const locale of browserLocales) {
          const normalizedLocale = locale.toLowerCase();
          if (normalizedLocale === "vi" || normalizedLocale.startsWith("vi-")) {
            return "VND";
          }
          if (normalizedLocale === "ko" || normalizedLocale.startsWith("ko-")) {
            return "KRW";
          }
          if (normalizedLocale === "zh" || normalizedLocale.startsWith("zh-")) {
            return "CNY";
          }
        }

        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (
          timezone.includes("Ho_Chi_Minh") ||
          timezone.includes("Saigon") ||
          timezone.includes("Bangkok")
        ) {
          return "VND";
        }
        if (timezone.includes("Seoul")) return "KRW";
        if (
          timezone.includes("Shanghai") ||
          timezone.includes("Chongqing") ||
          timezone.includes("Harbin") ||
          timezone.includes("Urumqi")
        ) {
          return "CNY";
        }

        return "USD";
      };

      const getCurrencyStateFromStorage = (): {
        currency: Currency;
        hasUserSelectedCurrency: boolean;
      } | null => {
        if (typeof window === "undefined") {
          return null;
        }

        try {
          const raw = window.localStorage.getItem("currency-storage");
          if (!raw) {
            return null;
          }

          const parsed = JSON.parse(raw) as {
            state?: {
              currency?: unknown;
              hasUserSelectedCurrency?: unknown;
            };
          };
          const persistedCurrency = parsed?.state?.currency;
          const persistedHasUserSelectedCurrency =
            parsed?.state?.hasUserSelectedCurrency;

          if (isSupportedCurrency(persistedCurrency)) {
            return {
              currency: persistedCurrency,
              hasUserSelectedCurrency: persistedHasUserSelectedCurrency === true,
            };
          }
        } catch {
          // Ignore malformed storage payload and fallback to browser detection.
        }

        return null;
      };

      return {
        // Initial state - mặc định là USD
        currency: "USD" as Currency,
        hasUserSelectedCurrency: false,

        // Set currency
        setCurrency: (currency: Currency) => {
          set({ currency, hasUserSelectedCurrency: true });
        },

        // Chỉ tự động set currency khi user chưa từng chọn thủ công
        initializeCurrency: () => {
          const { hasUserSelectedCurrency } = get();
          if (hasUserSelectedCurrency) {
            return;
          }

          const persistedState = getCurrencyStateFromStorage();
          if (persistedState) {
            set({
              currency: persistedState.currency,
              hasUserSelectedCurrency: persistedState.hasUserSelectedCurrency,
            });
            return;
          }

          const detectedCurrency = detectCurrencyFromBrowser();
          set({ currency: detectedCurrency });
        },

        formatCurrency: (amount: number, customCurrency?: Currency | string) => {
          const currencySymbols: Record<string, string> = {
            USD: "$",
            VND: "₫",
            EUR: "€",
            KRW: "₩",
            CNY: "¥",
          };

          const currency = customCurrency || get().currency;
          const symbol = currencySymbols[currency] || currency; // fallback to currency code if no symbol
          
          const isVND = currency === "VND";
          const formattedAmount = new Intl.NumberFormat("en-US", {
            minimumFractionDigits: isVND ? 0 : 2,
            maximumFractionDigits: isVND ? 0 : 2,
          }).format(amount);

          return `${symbol === currency ? symbol + " " : symbol}${formattedAmount}`;
        },
      };
    },
    {
      name: "currency-storage", // Tên key trong localStorage
      partialize: (state) => ({
        currency: state.currency,
        hasUserSelectedCurrency: state.hasUserSelectedCurrency,
      }),
    }
  )
);

