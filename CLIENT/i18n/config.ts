"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import vi from "@/messages/vi.json";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import ko from "@/messages/ko.json";

// Locale types
export type Locale = "vi" | "en" | "ko" | "zh";

// Locale constants
export const ALL_LOCALES: Locale[] = ["vi", "en", "ko", "zh"];
export const DEFAULT_LOCALE: Locale = "vi";
export const ADMIN_LOCALES: Locale[] = ["vi", "en"];
export const USER_LOCALES: Locale[] = ["vi", "en", "ko", "zh"];

// Validate locale
export function validateLocale(locale: string): locale is Locale {
  return ALL_LOCALES.includes(locale as Locale);
}

const resources = {
  vi: { translation: vi },
  en: { translation: en },
  zh: { translation: zh },
  ko: { translation: ko },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LOCALE,
    lng: DEFAULT_LOCALE,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "cookie", "navigator"],
      caches: ["localStorage", "cookie"],
      lookupFromPathIndex: 0,
    },
  });

export default i18n;
