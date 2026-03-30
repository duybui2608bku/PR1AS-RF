import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  ADMIN_LOCALES,
  USER_LOCALES,
  DEFAULT_LOCALE,
  validateLocale,
  type Locale,
} from "@/i18n/config";

/**
 * Locale State Interface
 */
interface LocaleState {
  locale: Locale;
  hasUserSelectedLocale: boolean;
  setLocale: (locale: Locale) => void;
  getAvailableLocales: (
    user?: { role?: string; roles?: string[] } | null
  ) => Locale[];
  isLocaleAvailable: (
    locale: Locale,
    user?: { role?: string; roles?: string[] } | null
  ) => boolean;
  initializeLocale: (user?: { role?: string; roles?: string[] } | null) => void;
}

/**
 * Locale Store với Zustand
 * Quản lý ngôn ngữ dựa trên role của user
 */
export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => {
      const regionToLocale: Partial<Record<string, Locale>> = {
        VN: "vi",
        KR: "ko",
        CN: "zh",
        TW: "zh",
        HK: "zh",
        MO: "zh",
      };

      const detectLocaleFromBrowser = (): Locale => {
        if (typeof window === "undefined") {
          return DEFAULT_LOCALE;
        }

        const browserLocales = navigator.languages?.length
          ? navigator.languages
          : [navigator.language];

        for (const locale of browserLocales) {
          try {
            const region = new Intl.Locale(locale).region;
            if (region && regionToLocale[region]) {
              return regionToLocale[region];
            }
          } catch {
            // Continue with language/timezone fallbacks.
          }
        }

        for (const locale of browserLocales) {
          const normalizedLocale = locale.toLowerCase();
          if (normalizedLocale === "vi" || normalizedLocale.startsWith("vi-")) {
            return "vi";
          }
          if (normalizedLocale === "ko" || normalizedLocale.startsWith("ko-")) {
            return "ko";
          }
          if (normalizedLocale === "zh" || normalizedLocale.startsWith("zh-")) {
            return "zh";
          }
          if (normalizedLocale === "en" || normalizedLocale.startsWith("en-")) {
            return "en";
          }
        }

        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (
          timezone.includes("Ho_Chi_Minh") ||
          timezone.includes("Saigon") ||
          timezone.includes("Bangkok")
        ) {
          return "vi";
        }
        if (timezone.includes("Seoul")) {
          return "ko";
        }
        if (
          timezone.includes("Shanghai") ||
          timezone.includes("Chongqing") ||
          timezone.includes("Harbin") ||
          timezone.includes("Urumqi")
        ) {
          return "zh";
        }

        return DEFAULT_LOCALE;
      };

      const getLocaleStateFromStorage = (): {
        locale: Locale;
        hasUserSelectedLocale: boolean;
      } | null => {
        if (typeof window === "undefined") {
          return null;
        }

        try {
          const raw = window.localStorage.getItem("locale-storage");
          if (!raw) {
            return null;
          }

          const parsed = JSON.parse(raw) as {
            state?: {
              locale?: unknown;
              hasUserSelectedLocale?: unknown;
            };
          };

          const persistedLocale = parsed?.state?.locale;
          const persistedHasUserSelectedLocale =
            parsed?.state?.hasUserSelectedLocale;

          if (typeof persistedLocale === "string" && validateLocale(persistedLocale)) {
            return {
              locale: persistedLocale,
              hasUserSelectedLocale: persistedHasUserSelectedLocale === true,
            };
          }
        } catch {
          // Ignore malformed storage and fallback to detection.
        }

        return null;
      };

      return {
        // Initial state - mặc định là DEFAULT_LOCALE
        locale: DEFAULT_LOCALE,
        hasUserSelectedLocale: false,

        // Set locale với validation
        setLocale: (locale: Locale) => {
          set({ locale, hasUserSelectedLocale: true });
        },

        // Lấy danh sách locale khả dụng dựa trên role
        getAvailableLocales: (
          user?: { role?: string; roles?: string[] } | null
        ): Locale[] => {
          // Nếu không có user được truyền vào, mặc định trả về USER_LOCALES
          // User sẽ được truyền vào từ component/hook khi cần
          if (!user) {
            return [...USER_LOCALES];
          }

          // Kiểm tra nếu user là admin
          const isAdmin =
            user.role === "admin" ||
            (Array.isArray(user.roles) && user.roles.includes("admin"));

          if (isAdmin) {
            return [...ADMIN_LOCALES];
          }

          return [...USER_LOCALES];
        },

        // Kiểm tra locale có khả dụng không
        isLocaleAvailable: (
          locale: Locale,
          user?: { role?: string; roles?: string[] } | null
        ): boolean => {
          const availableLocales = get().getAvailableLocales(user);
          return availableLocales.includes(locale);
        },

        // Khởi tạo locale dựa trên role hiện tại
        initializeLocale: (
          user?: { role?: string; roles?: string[] } | null
        ) => {
          const availableLocales = get().getAvailableLocales(user);
          const { hasUserSelectedLocale, locale: currentLocale } = get();

          if (!hasUserSelectedLocale) {
            const persistedState = getLocaleStateFromStorage();
            if (persistedState) {
              const nextLocale = availableLocales.includes(persistedState.locale)
                ? persistedState.locale
                : availableLocales[0] || DEFAULT_LOCALE;

              set({
                locale: nextLocale,
                hasUserSelectedLocale: persistedState.hasUserSelectedLocale,
              });
              return;
            }

            const detectedLocale = detectLocaleFromBrowser();
            const nextLocale = availableLocales.includes(detectedLocale)
              ? detectedLocale
              : availableLocales[0] || DEFAULT_LOCALE;

            set({ locale: nextLocale, hasUserSelectedLocale: false });
            return;
          }

          // Nếu locale hiện tại không khả dụng, set về locale đầu tiên trong danh sách
          if (!availableLocales.includes(currentLocale)) {
            if (availableLocales.length > 0) {
              set({ locale: availableLocales[0], hasUserSelectedLocale: false });
            }
          }
        },
      };
    },
    {
      name: "locale-storage", // Tên key trong localStorage
      partialize: (state) => ({
        locale: state.locale,
        hasUserSelectedLocale: state.hasUserSelectedLocale,
      }),
      // Khi rehydrate, kiểm tra locale có hợp lệ không
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            // Không gọi initializeLocale ở đây vì user có thể chưa sẵn sàng
            // Sẽ được gọi từ I18nProvider khi component mount
          }
        };
      },
    }
  )
);
