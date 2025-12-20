"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Layout, Menu, Avatar, Dropdown, Button, Space, Typography } from "antd";
import type { MenuProps } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  HomeOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useLogout } from "@/lib/hooks/use-auth";
import { ThemeToggle } from "@/lib/components/theme-toggle";
import { LanguageSwitcher } from "@/lib/components/language-switcher";

const { Header: AntHeader } = Layout;
const { Text } = Typography;

/**
 * Header component với menu user và nút đăng xuất
 */
export function Header() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const logoutMutation = useLogout();
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);

  /**
   * Xử lý đăng xuất
   */
  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      router.push("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  /**
   * Menu items cho user dropdown
   */
  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: t("dashboard.header.profile"),
      onClick: () => {
        // Navigate to profile page if needed
      },
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: t("dashboard.header.logout"),
      onClick: handleLogout,
      danger: true,
    },
  ];

  /**
   * Menu items cho navigation
   */
  const navMenuItems: MenuProps["items"] = [
    {
      key: "home",
      icon: <HomeOutlined />,
      label: (
        <Link href="/" style={{ color: "inherit" }}>
          {t("home.nav.home")}
        </Link>
      ),
    },
    {
      key: "about",
      label: (
        <Link href="/#about" style={{ color: "inherit" }}>
          {t("home.nav.about")}
        </Link>
      ),
    },
    {
      key: "services",
      label: (
        <Link href="/#services" style={{ color: "inherit" }}>
          {t("home.nav.services")}
        </Link>
      ),
    },
    {
      key: "contact",
      label: (
        <Link href="/#contact" style={{ color: "inherit" }}>
          {t("home.nav.contact")}
        </Link>
      ),
    },
  ];

  return (
    <AntHeader
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: "var(--ant-color-bg-container)",
        borderBottom: "1px solid var(--ant-color-border-secondary)",
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{
          fontSize: 20,
          fontWeight: "bold",
          color: "var(--ant-color-primary)",
          textDecoration: "none",
          marginRight: 24,
        }}
      >
        {t("home.logo")}
      </Link>

      {/* Desktop Navigation */}
      <Menu
        mode="horizontal"
        items={navMenuItems}
        style={{
          flex: 1,
          minWidth: 0,
          borderBottom: "none",
          background: "transparent",
        }}
      />

      {/* Right side: Auth buttons, Theme toggle, Language switcher */}
      <Space size="middle" style={{ marginLeft: "auto" }}>
        <ThemeToggle />
        <LanguageSwitcher />

        {isAuthenticated && user ? (
          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            arrow
          >
            <Space
              style={{
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: 4,
                transition: "background-color 0.3s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "var(--ant-color-fill-tertiary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <Avatar
                size="small"
                icon={<UserOutlined />}
                src={user.avatar}
                style={{ backgroundColor: "var(--ant-color-primary)" }}
              />
              <Text strong style={{ display: "inline" }}>
                {user.name || user.email}
              </Text>
            </Space>
          </Dropdown>
        ) : (
          <Space>
            <Link href="/auth/login">
              <Button type="text">{t("auth.login")}</Button>
            </Link>
            <Link href="/auth/register">
              <Button type="primary">{t("auth.user.register")}</Button>
            </Link>
          </Space>
        )}
      </Space>
    </AntHeader>
  );
}

