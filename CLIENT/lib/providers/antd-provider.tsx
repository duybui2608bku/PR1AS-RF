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
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";

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

  return (
    <AntdRegistry>
      <ThemeSync />
      <ConfigProvider
        locale={antdLocale}
        theme={{
          // Cấu hình token (màu sắc, spacing, typography, etc.)
          token: {
            // Primary color
            colorPrimary: "#1890ff",
            // Border radius
            borderRadius: 6,
            // Font size
            fontSize: 14,
          },
          // Cấu hình component cụ thể
          components: {
            Button: {
              borderRadius: 6,
            },
            Input: {
              borderRadius: 6,
            },
            Card: {
              borderRadius: 8,
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
