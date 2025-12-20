"use client";

import { Select } from "antd";
import { useI18n } from "../hooks/use-i18n";
import type { Locale } from "@/i18n/config";

/**
 * Component chuyển đổi ngôn ngữ
 */
export function LanguageSwitcher() {
  const { locale, changeLocale, availableLocales, getLocaleLabel } = useI18n();

  return (
    <Select
      value={locale}
      onChange={(value) => changeLocale(value as Locale)}
      style={{ minWidth: 120 }}
    >
      {availableLocales.map((loc) => (
        <Select.Option key={loc} value={loc}>
          {getLocaleLabel(loc)}
        </Select.Option>
      ))}
    </Select>
  );
}

