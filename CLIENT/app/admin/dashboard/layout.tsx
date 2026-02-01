"use client";

import { Layout, Menu, Avatar, Dropdown, Space, Typography } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useI18n } from "@/lib/hooks/use-i18n";
import { useAuthStore } from "@/lib/stores/auth.store";
import { ThemeToggle } from "@/lib/components/theme-toggle";
import { LanguageSwitcher } from "@/lib/components/language-switcher";
import type { MenuProps } from "antd";
import styles from "./layout.module.scss";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const { user, logout } = useAuthStore();

  const menuItems: MenuProps["items"] = [
    {
      key: "/admin/dashboard",
      icon: <DashboardOutlined />,
      label: t("dashboard.menu.dashboard"),
    },
    {
      key: "/admin/dashboard/user",
      icon: <UserOutlined />,
      label: t("dashboard.menu.users"),
    },
    {
      key: "/admin/dashboard/wallet",
      icon: <WalletOutlined />,
      label: t("dashboard.menu.transactions"),
    },
    {
      key: "/admin/settings",
      icon: <SettingOutlined />,
      label: t("dashboard.menu.settings"),
    },
  ];

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: t("dashboard.header.profile"),
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: t("dashboard.header.settings"),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: t("dashboard.header.logout"),
      danger: true,
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === "logout") {
      logout();
      router.push("/admin/auth");
    } else if (key === "profile") {
      router.push("/admin/profile");
    } else if (key === "settings") {
      router.push("/admin/settings");
    } else {
      router.push(key);
    }
  };

  return (
    <Layout className={styles.layout}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={250}
        className={styles.sider}
      >
        <div
          className={`${styles.logoBlock} ${!collapsed ? styles.expanded : ""}`}
        >
          {collapsed ? "PR1AS" : "PR1AS Admin"}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          className={styles.menu}
        />
      </Sider>
      <Layout
        className={`${styles.mainLayout} ${collapsed ? styles.collapsed : styles.expanded}`}
      >
        <Header className={styles.header}>
          <Space>
            <div
              className={styles.trigger}
              onClick={() => setCollapsed(!collapsed)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setCollapsed(!collapsed)}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>
            <Text strong className={styles.headerTitle}>
              {t("dashboard.title")}
            </Text>
          </Space>
          <Space size="middle">
            <BellOutlined className={styles.headerIcon} />
            <ThemeToggle />
            <LanguageSwitcher />
            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: handleMenuClick,
              }}
              placement="bottomRight"
            >
              <Space className={styles.avatarSpace}>
                <Avatar icon={<UserOutlined />} />
                {user?.email && <Text strong>{user.email.split("@")[0]}</Text>}
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content className={styles.content}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
