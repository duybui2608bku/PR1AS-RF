"use client";

import { Select } from "antd";
import { useI18n } from "../hooks/use-i18n";
import type { Locale } from "@/i18n/config";
import { memo, useMemo, useCallback } from "react";

const LanguageSwitcherComponent = () => {
  const { locale, changeLocale, availableLocales, getLocaleLabel } = useI18n();

  const handleChange = useCallback((value: unknown) => {
    changeLocale(value as Locale);
  }, [changeLocale]);

  const options = useMemo(() => 
    availableLocales.map((loc) => (
      <Select.Option key={loc} value={loc}>
        {getLocaleLabel(loc)}
      </Select.Option>
    )), [availableLocales, getLocaleLabel]);

  return (
    <Select
      value={locale}
      onChange={handleChange}
      style={{ minWidth: 120 }}
    >
      {options}
    </Select>
  );
};

export const LanguageSwitcher = memo(LanguageSwitcherComponent);

