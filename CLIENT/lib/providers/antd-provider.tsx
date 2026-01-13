"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, theme, App } from "antd";
import viVN from "antd/locale/vi_VN";
import enUS from "antd/locale/en_US";
import koKR from "antd/locale/ko_KR";
import zhCN from "antd/locale/zh_CN";
import { useLocaleStore } from "../stores/locale.store";
import { useThemeStore } from "../stores/theme.store";
import { ThemeSync } from "../components/theme-sync";
import { AppNotificationInit } from "../components/app-notification-init";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";

/**
 * Lấy giá trị CSS variable
 */
function getCSSVariable(variableName: string): string {
  if (typeof window === "undefined") {
    return "#711111"; // Fallback cho SSR
  }
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue(variableName)
      .trim() || "#711111"
  );
}

interface AntdProviderProps {
  children: ReactNode;
}

/**
 * Map locale từ i18n sang Ant Design locale
 */
const antdLocaleMap: Record<Locale, typeof viVN> = {
  vi: viVN,
  en: enUS,
  ko: koKR,
  zh: zhCN,
};

/**
 * Ant Design Provider với cấu hình theme và locale động
 */
export function AntdProvider({ children }: AntdProviderProps) {
  const { locale } = useLocaleStore();
  const { theme: themeMode } = useThemeStore();
  const antdLocale = antdLocaleMap[locale] || viVN;
  const [primaryColor, setPrimaryColor] = useState("#711111");

  // Lấy màu primary từ CSS variable khi component mount
  useEffect(() => {
    const color = getCSSVariable("--ant-color-primary");
    setPrimaryColor(color);
  }, []);

  return (
    <AntdRegistry>
      <ThemeSync />
      <ConfigProvider
        locale={antdLocale}
        theme={{
          token: {
            colorPrimary: primaryColor,
            borderRadius: 8,
            fontSize: 14,
            fontFamily:
              'var(--font-work-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          },
          components: {
            Button: {
              borderRadius: 8,
            },
            Input: {
              borderRadius: 8,
            },
            InputNumber: {
              borderRadius: 8,
            },
            Select: {
              borderRadius: 8,
            },
            DatePicker: {
              borderRadius: 8,
            },
            Card: {
              borderRadius: 12,
            },
            Form: {},
          },
          algorithm:
            themeMode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        <App>
          <AppNotificationInit>{children}</AppNotificationInit>
        </App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
