import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_LOCALE,
  ACTIVE_LOCALES,
  validateLocale,
  type Locale,
} from "@/i18n/config";

interface LocaleState {
  locale: Locale;
  hasUserSelectedLocale: boolean;
  setLocale: (locale: Locale) => void;
  getAvailableLocales: (
    user?: { role?: string; roles?: string[] } | null,
  ) => Locale[];
  isLocaleAvailable: (
    locale: Locale,
    user?: { role?: string; roles?: string[] } | null,
  ) => boolean;
  initializeLocale: (user?: { role?: string; roles?: string[] } | null) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: DEFAULT_LOCALE,
      hasUserSelectedLocale: false,

      setLocale: (locale: Locale) => {
        set({
          locale: validateLocale(locale) ? locale : DEFAULT_LOCALE,
          hasUserSelectedLocale: true,
        });
      },

      getAvailableLocales: (
        user?: { role?: string; roles?: string[] } | null,
      ): Locale[] => {
        void user;
        return [...ACTIVE_LOCALES];
      },

      isLocaleAvailable: (
        locale: Locale,
        user?: { role?: string; roles?: string[] } | null,
      ): boolean => {
        void user;
        return validateLocale(locale);
      },

      initializeLocale: (user?: { role?: string; roles?: string[] } | null) => {
        void user;
        set({ locale: DEFAULT_LOCALE, hasUserSelectedLocale: false });
      },
    }),
    {
      name: "locale-storage",
      partialize: () => ({
        locale: DEFAULT_LOCALE,
        hasUserSelectedLocale: false,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (state) {
            state.locale = DEFAULT_LOCALE;
            state.hasUserSelectedLocale = false;
          }
        };
      },
    },
  ),
);
