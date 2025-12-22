"use client";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, theme } from "antd";
import viVN from "antd/locale/vi_VN";
import enUS from "antd/locale/en_US";
import koKR from "antd/locale/ko_KR";
import zhCN from "antd/locale/zh_CN";
import { useLocaleStore } from "../stores/locale.store";
import { useThemeStore } from "../stores/theme.store";
import { ThemeSync } from "../components/theme-sync";
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
          // Cấu hình token (màu sắc, spacing, typography, etc.)
          token: {
            // Primary color từ CSS variable
            colorPrimary: primaryColor,
            // Border radius mặc định
            borderRadius: 8,
            // Font size
            fontSize: 14,
            // Font family
            fontFamily:
              'var(--font-work-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          },
          // Cấu hình component cụ thể
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
            Form: {
              // Form container không cần border-radius riêng
            },
          },
          // Algorithm: sử dụng dark mode hoặc light mode
          algorithm:
            themeMode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        {children}
      </ConfigProvider>
    </AntdRegistry>
  );
}
