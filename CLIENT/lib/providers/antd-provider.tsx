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
import {
  ThemeMode,
  ThemeColor,
  ThemeCSSVariable,
  ThemeDefault,
  ThemeBorderRadius,
  ThemeFontSize,
} from "../constants/theme.constants";

function getCSSVariable(variableName: string): string {
  if (typeof window === "undefined") {
    return ThemeDefault.PRIMARY_COLOR;
  }
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue(variableName)
      .trim() || ThemeDefault.PRIMARY_COLOR
  );
}

interface AntdProviderProps {
  children: ReactNode;
}

const antdLocaleMap: Record<Locale, typeof viVN> = {
  vi: viVN,
  en: enUS,
  ko: koKR,
  zh: zhCN,
};

export function AntdProvider({ children }: AntdProviderProps) {
  const { locale } = useLocaleStore();
  const { theme: themeMode } = useThemeStore();
  const antdLocale = antdLocaleMap[locale] || viVN;
  const [primaryColor, setPrimaryColor] = useState(ThemeDefault.PRIMARY_COLOR);

  useEffect(() => {
    const color = getCSSVariable(ThemeCSSVariable.ANT_COLOR_PRIMARY);
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
            borderRadius: ThemeBorderRadius.MEDIUM,
            fontSize: ThemeFontSize.SM,
            fontFamily:
              'var(--font-work-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          },
          components: {
            Button: {
              borderRadius: ThemeBorderRadius.MEDIUM,
            },
            Input: {
              borderRadius: ThemeBorderRadius.MEDIUM,
            },
            InputNumber: {
              borderRadius: ThemeBorderRadius.MEDIUM,
            },
            Select: {
              borderRadius: ThemeBorderRadius.MEDIUM,
            },
            DatePicker: {
              borderRadius: ThemeBorderRadius.MEDIUM,
            },
            Card: {
              borderRadius: ThemeBorderRadius.LARGE,
            },
            Form: {},
          },
          algorithm:
            themeMode === ThemeMode.DARK
              ? theme.darkAlgorithm
              : theme.defaultAlgorithm,
        }}
      >
        <App>
          <AppNotificationInit>{children}</AppNotificationInit>
        </App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
