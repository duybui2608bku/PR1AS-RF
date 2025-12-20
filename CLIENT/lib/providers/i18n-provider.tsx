"use client";

import { useLocaleStore } from "../stores/locale.store";
import { useAuthStore } from "../stores/auth.store";
import { useEffect } from "react";
import type { ReactNode } from "react";

interface I18nProviderProps {
  children: ReactNode;
}

/**
 * I18n Provider - Chỉ khởi tạo locale store
 * Messages đã được load ở server-side và truyền qua NextIntlClientProvider trong layout
 */
export function I18nProvider({ children }: I18nProviderProps) {
  const { initializeLocale } = useLocaleStore();
  const { user } = useAuthStore();

  // Khởi tạo locale khi component mount hoặc user thay đổi
  useEffect(() => {
    initializeLocale(user || null);
  }, [user, initializeLocale]);

  return <>{children}</>;
}
