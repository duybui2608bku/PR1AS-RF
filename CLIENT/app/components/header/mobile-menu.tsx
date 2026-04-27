"use client";

import { useTranslation } from "react-i18next";
import { Divider, Space } from "antd";
import { ThemeToggle } from "@/lib/components/theme-toggle";
import styles from "../header.module.scss";

interface MobileMenuProps {
  isAdmin: boolean;
  workerButton: React.ReactNode;
  authSectionMobile: React.ReactNode;
}

export const MobileMenu = ({
  isAdmin,
  workerButton,
  authSectionMobile,
}: MobileMenuProps) => {
  const { t } = useTranslation();

  return (
    <div className={styles.popoverContent}>
      {!isAdmin && (
        <div className={styles.workerButtonBlock}>{workerButton}</div>
      )}
      <Divider className={styles.dividerSpacing} />

      <Space
        orientation="vertical"
        size="small"
        className={styles.settingsBlock}
      >
        <span className={styles.settingsLabel}>{t("header.theme")}</span>
        <ThemeToggle />
      </Space>

      <Divider className={styles.dividerSpacing} />

      {authSectionMobile}
    </div>
  );
};
