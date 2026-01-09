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
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={250}
        style={{
          overflow: "auto",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          background: "#000000",
        }}
      >
        <div
          style={{
            height: 64,
            margin: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            color: "white",
            fontSize: collapsed ? 20 : 18,
            fontWeight: "bold",
          }}
        >
          {collapsed ? "PR1AS" : "PR1AS Admin"}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            background: "#000000",
            borderRight: "none",
          }}
        />
      </Sider>
      <Layout
        style={{
          marginLeft: collapsed ? 80 : 250,
          transition: "margin-left 0.2s",
          background: "#000000",
        }}
      >
        <Header
          style={{
            padding: "0 24px",
            background: "var(--ant-color-bg-container)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <Space>
            <div
              style={{ cursor: "pointer", fontSize: 18 }}
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>
            <Text strong style={{ fontSize: 18 }}>
              {t("dashboard.title")}
            </Text>
          </Space>
          <Space size="middle">
            <BellOutlined style={{ fontSize: 18, cursor: "pointer" }} />
            <ThemeToggle />
            <LanguageSwitcher />
            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: handleMenuClick,
              }}
              placement="bottomRight"
            >
              <Space style={{ cursor: "pointer" }}>
                <Avatar icon={<UserOutlined />} />
                {user?.email && <Text strong>{user.email.split("@")[0]}</Text>}
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: "24px 16px",
            padding: 24,
            minHeight: 280,
            background: "#000000",
            borderRadius: 8,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
