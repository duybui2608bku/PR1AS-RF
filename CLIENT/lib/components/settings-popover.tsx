"use client";

import { Popover, Select, Space, Divider, Button } from "antd";
import { GlobalOutlined, SunOutlined, MoonOutlined } from "@ant-design/icons";
import { useTheme } from "../hooks/use-theme";
import { useI18n } from "../hooks/use-i18n";
import { useCurrency } from "../hooks/use-currency";
import type { Locale } from "@/i18n/config";
import type { Currency } from "../stores/currency.store";
import { ThemeMode } from "../constants/theme.constants";

export function SettingsPopover() {
  const { theme, toggleTheme } = useTheme();
  const { locale, changeLocale, availableLocales, getLocaleLabel } = useI18n();
  const { currency, setCurrency, currencies, getCurrencyLabel } = useCurrency();

  const content = (
    <Space orientation="vertical" size="middle" style={{ minWidth: 200 }}>
      <div>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>Tiền tệ</div>
        <Select
          value={currency}
          onChange={(value) => setCurrency(value as Currency)}
          style={{ width: "100%" }}
        >
          {currencies.map((curr) => (
            <Select.Option key={curr} value={curr}>
              {getCurrencyLabel(curr)}
            </Select.Option>
          ))}
        </Select>
      </div>

      <Divider style={{ margin: "8px 0" }} />

      <div>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>Ngôn ngữ</div>
        <Select
          value={locale}
          onChange={(value) => changeLocale(value as Locale)}
          style={{ width: "100%" }}
        >
          {availableLocales.map((loc) => (
            <Select.Option key={loc} value={loc}>
              {getLocaleLabel(loc)}
            </Select.Option>
          ))}
        </Select>
      </div>

      <Divider style={{ margin: "8px 0" }} />

      <div>
        <div style={{ marginBottom: 8, fontWeight: 500 }}>Giao diện</div>
        <Button
          type="text"
          icon={
            theme === ThemeMode.LIGHT ? <MoonOutlined /> : <SunOutlined />
          }
          onClick={toggleTheme}
          style={{ width: "100%", textAlign: "left" }}
        >
          {theme === ThemeMode.LIGHT ? "Chế độ tối" : "Chế độ sáng"}
        </Button>
      </div>
    </Space>
  );

  return (
    <Popover
      content={content}
      title="Cài đặt"
      trigger="click"
      placement="bottomRight"
    >
      <Button
        type="text"
        icon={<GlobalOutlined />}
        style={{ fontSize: 18 }}
      />
    </Popover>
  );
}

