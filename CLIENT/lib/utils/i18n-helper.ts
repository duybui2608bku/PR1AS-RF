"use client";

import { useLocaleStore } from "../stores/locale.store";
import type { Locale } from "@/i18n/config";

/**
 * Messages cache để tránh load lại nhiều lần
 */
let messagesCache: Record<Locale, Record<string, any>> = {} as Record<
  Locale,
  Record<string, any>
>;

/**
 * Load messages cho một locale
 */
async function loadMessages(locale: Locale): Promise<Record<string, any>> {
  if (messagesCache[locale]) {
    return messagesCache[locale];
  }

  try {
    const messages = await import(`@/messages/${locale}.json`);
    messagesCache[locale] = messages.default;
    return messages.default;
  } catch (error) {
    // Log error chỉ trong development mode
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error(`Failed to load messages for locale: ${locale}`, error);
    }
    // Fallback về en nếu không load được
    if (locale !== "en") {
      return loadMessages("en");
    }
    return {};
  }
}

/**
 * Lấy translation từ key
 */
export async function getTranslation(
  key: string,
  locale?: Locale
): Promise<string> {
  const currentLocale = locale || useLocaleStore.getState().locale;
  const messages = await loadMessages(currentLocale);

  // Hỗ trợ nested keys như "errors.network.timeout"
  const keys = key.split(".");
  let value: any = messages;

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      return key; // Trả về key nếu không tìm thấy
    }
  }

  return typeof value === "string" ? value : key;
}

/**
 * Lấy translation sync (sử dụng cache)
 */
export function getTranslationSync(key: string, locale?: Locale): string {
  const currentLocale = locale || useLocaleStore.getState().locale;
  const messages = messagesCache[currentLocale];

  if (!messages) {
    // Nếu chưa có cache, trả về key và load async
    loadMessages(currentLocale);
    return key;
  }

  // Hỗ trợ nested keys
  const keys = key.split(".");
  let value: any = messages;

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = value[k];
    } else {
      return key;
    }
  }

  return typeof value === "string" ? value : key;
}

/**
 * Format message với params
 */
export function formatMessage(
  message: string,
  params: Record<string, string | number>
): string {
  let formatted = message;
  for (const [key, value] of Object.entries(params)) {
    formatted = formatted.replace(`{${key}}`, String(value));
  }
  return formatted;
}

