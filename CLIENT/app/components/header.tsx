"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Layout,
  Avatar,
  Dropdown,
  Button,
  Space,
  Popover,
  Select,
  Divider,
} from "antd";
import type { MenuProps } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  MenuOutlined,
  MessageOutlined,
  SettingOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useLogout, useSwitchRole } from "@/lib/hooks/use-auth";
import { SettingsPopover } from "@/lib/components/settings-popover";
import { ThemeToggle } from "@/lib/components/theme-toggle";
import { LanguageSwitcher } from "@/lib/components/language-switcher";
import { useCurrency } from "@/lib/hooks/use-currency";
import { AuthModal } from "@/lib/components/auth-modal";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import { getProfileRoute } from "@/lib/utils/profile-navigation";
import { AppRoute, UserRole } from "@/lib/constants/routes";

const { Header: AntHeader } = Layout;

const MOBILE_BREAKPOINT = 768;

export function Header() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const logoutMutation = useLogout();
  const switchRoleMutation = useSwitchRole();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "register">(
    "login"
  );
  const [isMobile, setIsMobile] = useState(false);
  const { currency, setCurrency, currencies, getCurrencyLabel } = useCurrency();
  const { handleError } = useErrorHandler();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const lastActiveRole = (user as unknown as { last_active_role?: string })
    ?.last_active_role;
  const userRoles = (user as unknown as { roles?: string[] })?.roles || [];
  const workerProfile = (
    user as unknown as {
      worker_profile?: unknown | null;
    }
  )?.worker_profile;

  const hasWorkerRole = userRoles.includes(UserRole.WORKER);
  const isWorkerActive = lastActiveRole === UserRole.WORKER;
  const hasWorkerProfile = workerProfile && workerProfile !== null;
  const isAdmin = userRoles.includes(UserRole.ADMIN);

  let workerButtonLabel: string;
  if (isWorkerActive) {
    workerButtonLabel = t("header.hireService");
  } else if (hasWorkerProfile) {
    workerButtonLabel = t("header.myServices");
  } else {
    workerButtonLabel = t("header.becomeWorker");
  }

  const handleSwitchRole = async () => {
    if (!isAuthenticated || !user) {
      handleOpenLogin();
      return;
    }

    if (isWorkerActive) {
      try {
        await switchRoleMutation.mutateAsync(UserRole.CLIENT);
        router.push(AppRoute.HOME);
      } catch (error) {
        handleError(error);
      }
      return;
    }

    if (!hasWorkerRole) {
      if (!workerProfile || workerProfile === null) {
        router.push(AppRoute.WORKER_SETUP);
      } else {
        router.push(AppRoute.HOME);
      }
      return;
    }

    if (hasWorkerRole && !isWorkerActive) {
      if (hasWorkerProfile) {
        try {
          await switchRoleMutation.mutateAsync(UserRole.WORKER);
          router.push(AppRoute.HOME);
        } catch (error) {
          handleError(error);
        }
      } else {
        router.push(AppRoute.WORKER_SETUP);
      }
    }
  };

  const getUserInitial = () => {
    const displayName = user?.name || user?.email || "";
    return displayName.charAt(0).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      handleError(error);
    }
  };

  const handleOpenLogin = () => {
    setAuthModalTab("login");
    setAuthModalOpen(true);
  };

  const handleOpenRegister = () => {
    setAuthModalTab("register");
    setAuthModalOpen(true);
  };

  const handleNavigateToAdminDashboard = () => {
    router.push(AppRoute.ADMIN_DASHBOARD);
  };

  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: t("dashboard.header.profile"),
      onClick: () => {
        const profileRoute = getProfileRoute(user);
        router.push(profileRoute);
      },
    },
    {
      key: "messages",
      icon: <MessageOutlined />,
      label: t("dashboard.header.messages"),
      onClick: () => {
        router.push(AppRoute.CHAT);
      },
    },
    {
      key: "wallet",
      icon: <WalletOutlined />,
      label: t("dashboard.header.wallet"),
      onClick: () => {
        router.push(AppRoute.CLIENT_WALLET);
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

  const adminMenuItems: MenuProps["items"] = [
    {
      key: "admin-dashboard",
      icon: <SettingOutlined />,
      label: t("dashboard.header.admin"),
      onClick: handleNavigateToAdminDashboard,
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

  const workerButton = (
    <Button
      type="primary"
      onClick={handleSwitchRole}
      loading={switchRoleMutation.isPending}
    >
      {workerButtonLabel}
    </Button>
  );

  const renderAvatarDropdown = (menuItems: MenuProps["items"]) => (
    <Dropdown
      menu={{ items: menuItems }}
      placement="bottomRight"
      trigger={["hover"]}
    >
      <div style={{ cursor: "pointer" }}>
        <Avatar
          size="large"
          src={user?.avatar}
          icon={!user?.avatar ? <UserOutlined /> : undefined}
          style={{
            backgroundColor: !user?.avatar
              ? "var(--ant-color-primary)"
              : undefined,
          }}
        >
          {!user?.avatar && getUserInitial()}
        </Avatar>
      </div>
    </Dropdown>
  );

  const authSectionDesktop =
    isAuthenticated && user ? (
      <Space size="middle">
        {renderAvatarDropdown(isAdmin ? adminMenuItems : userMenuItems)}
      </Space>
    ) : (
      <Space>
        <Button type="text" onClick={handleOpenLogin}>
          {t("auth.login")}
        </Button>
        <Button type="primary" onClick={handleOpenRegister}>
          {t("auth.user.register")}
        </Button>
      </Space>
    );

  const authSectionMobile =
    isAuthenticated && user ? (
      <Space size="middle">
        {renderAvatarDropdown(isAdmin ? adminMenuItems : userMenuItems)}
      </Space>
    ) : (
      <Space direction="vertical" style={{ width: "100%" }}>
        <Button type="primary" onClick={handleOpenLogin} block>
          {t("auth.login")}
        </Button>
        <Button onClick={handleOpenRegister} block>
          {t("auth.user.register")}
        </Button>
      </Space>
    );

  const mobilePopoverContent = (
    <div style={{ width: 280, padding: "8px 0" }}>
      {!isAdmin && <div style={{ marginBottom: 16 }}>{workerButton}</div>}
      {!isAdmin && <SettingsPopover />}
      <Divider style={{ margin: "12px 0" }} />

      <div style={{ marginBottom: 8 }}>
        <span style={{ fontWeight: 500 }}>{t("header.currency")}</span>
      </div>
      <Select
        value={currency}
        onChange={(value) => setCurrency(value as any)}
        style={{ width: "100%" }}
        size="middle"
      >
        {currencies.map((curr) => (
          <Select.Option key={curr} value={curr}>
            {getCurrencyLabel(curr as any)}
          </Select.Option>
        ))}
      </Select>

      <Divider style={{ margin: "12px 0" }} />

      <div style={{ marginBottom: 8 }}>
        <span style={{ fontWeight: 500 }}>{t("header.language")}</span>
      </div>
      <LanguageSwitcher />

      <Divider style={{ margin: "12px 0" }} />

      <div style={{ marginBottom: 8 }}>
        <span style={{ fontWeight: 500 }}>{t("header.theme")}</span>
      </div>
      <ThemeToggle />

      <Divider style={{ margin: "12px 0" }} />

      {authSectionMobile}
    </div>
  );

  return (
    <AntHeader
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        background: "var(--bg-dark-primary)",
        borderBottom: "1px solid var(--bg-dark-secondary)",
        position: "sticky",
        top: 0,
        zIndex: 1000,
      }}
    >
      <Link
        href={AppRoute.HOME}
        style={{ fontSize: 20, fontWeight: "bold", color: "inherit" }}
      >
        {t("home.logo")}
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {!isMobile && (
          <Space size="middle">
            {!isAdmin && workerButton}
            {!isAdmin && <SettingsPopover />}
            {authSectionDesktop}
          </Space>
        )}

        {isMobile && (
          <Popover
            content={mobilePopoverContent}
            trigger="click"
            placement="bottomRight"
          >
            <Button type="text" icon={<MenuOutlined />} />
          </Popover>
        )}
      </div>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </AntHeader>
  );
}
