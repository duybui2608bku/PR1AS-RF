"use client";

import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { useLocaleStore } from "../stores/locale.store";
import { useAuthStore } from "../stores/auth.store";
import type { Locale } from "@/i18n/config";
import i18n from "@/i18n/config";

/**
 * Hook để sử dụng i18n với các tính năng bổ sung
 */
export function useI18n() {
  const { t } = useTranslation();
  const { locale, setLocale, getAvailableLocales, isLocaleAvailable, initializeLocale } =
    useLocaleStore();
  const { user } = useAuthStore();

  // Khi user thay đổi (login/logout), validate lại locale
  useEffect(() => {
    initializeLocale(user || null);
  }, [user, initializeLocale]);

  // Đồng bộ locale với i18next
  useEffect(() => {
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);

  /**
   * Thay đổi ngôn ngữ
   */
  const changeLocale = (newLocale: Locale) => {
    if (isLocaleAvailable(newLocale, user || null)) {
      setLocale(newLocale);
      i18n.changeLanguage(newLocale);
    }
  };

  /**
   * Lấy danh sách ngôn ngữ khả dụng
   */
  const availableLocales = getAvailableLocales(user || null);

  /**
   * Kiểm tra xem user có phải admin không
   */
  const isAdmin =
    user?.role === "admin" ||
    (Array.isArray(user?.roles) && user.roles.includes("admin"));

  /**
   * Lấy label cho locale
   */
  const getLocaleLabel = (locale: Locale): string => {
    const labels: Record<Locale, string> = {
      en: "English",
      vi: "Tiếng Việt",
      ko: "한국어",
      zh: "中文",
    };
    return labels[locale] || locale;
  };

  return {
    t,
    locale,
    changeLocale,
    availableLocales,
    isLocaleAvailable,
    isAdmin,
    getLocaleLabel,
  };
}

