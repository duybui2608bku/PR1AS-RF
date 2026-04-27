"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import vi from "@/messages/vi.json";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import ko from "@/messages/ko.json";

export type Locale = "vi" | "en" | "ko" | "zh";

export const DEFAULT_LOCALE: Locale = "vi";
export const MULTILINGUAL_ENABLED = false;
export const SUPPORTED_LOCALES: Locale[] = ["vi", "en", "ko", "zh"];
export const ACTIVE_LOCALES: Locale[] = MULTILINGUAL_ENABLED
  ? SUPPORTED_LOCALES
  : [DEFAULT_LOCALE];
export const ALL_LOCALES: Locale[] = ACTIVE_LOCALES;
export const ADMIN_LOCALES: Locale[] = ACTIVE_LOCALES;
export const USER_LOCALES: Locale[] = ACTIVE_LOCALES;

export function validateLocale(locale: string): locale is Locale {
  return ALL_LOCALES.includes(locale as Locale);
}

const resources = {
  vi: { translation: vi },
  en: { translation: en },
  zh: { translation: zh },
  ko: { translation: ko },
};

i18n.use(initReactI18next).init({
  resources,
  fallbackLng: DEFAULT_LOCALE,
  lng: DEFAULT_LOCALE,
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
