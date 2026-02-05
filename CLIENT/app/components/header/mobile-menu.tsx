"use client";

import { useTranslation } from "react-i18next";
import { Button, Divider, Select, Space } from "antd";
import { SettingsPopover } from "@/lib/components/settings-popover";
import { LanguageSwitcher } from "@/lib/components/language-switcher";
import { ThemeToggle } from "@/lib/components/theme-toggle";
import { useCurrency } from "@/lib/hooks/use-currency";
import styles from "../header.module.scss";

interface MobileMenuProps {
  isAdmin: boolean;
  workerButton: React.ReactNode;
  authSectionMobile: React.ReactNode;
}

export const MobileMenu = ({ isAdmin, workerButton, authSectionMobile }: MobileMenuProps) => {
  const { t } = useTranslation();
  const { currency, setCurrency, currencies, getCurrencyLabel } = useCurrency();

  return (
    <div className={styles.popoverContent}>
      {!isAdmin && (
        <div className={styles.workerButtonBlock}>{workerButton}</div>
      )}
      {!isAdmin && <SettingsPopover />}
      <Divider className={styles.dividerSpacing} />

      <Space orientation="vertical" size="small" className={styles.settingsBlock}>
        <span className={styles.settingsLabel}>{t("header.currency")}</span>
        <Select
          value={currency}
          onChange={(value) => setCurrency(value as any)}
          className={styles.selectFullWidth}
          size="middle"
        >
          {currencies.map((curr) => (
            <Select.Option key={curr} value={curr}>
              {getCurrencyLabel(curr as any)}
            </Select.Option>
          ))}
        </Select>
      </Space>

      <Divider className={styles.dividerSpacing} />

      <Space orientation="vertical" size="small" className={styles.settingsBlock}>
        <span className={styles.settingsLabel}>{t("header.language")}</span>
        <LanguageSwitcher />
      </Space>

      <Divider className={styles.dividerSpacing} />

      <Space orientation="vertical" size="small" className={styles.settingsBlock}>
        <span className={styles.settingsLabel}>{t("header.theme")}</span>
        <ThemeToggle />
      </Space>

      <Divider className={styles.dividerSpacing} />

      {authSectionMobile}
    </div>
  );
};
