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
  Typography,
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

const { Header: AntHeader } = Layout;
const { Text } = Typography;

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
  const hasWorkerRole = userRoles.includes("worker");
  const isWorkerActive = lastActiveRole === "worker";
  const hasWorkerProfile = workerProfile && workerProfile !== null;

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
        await switchRoleMutation.mutateAsync("client");
        router.push("/");
      } catch (error) {
        handleError(error);
      }
      return;
    }

    if (!hasWorkerRole) {
      if (!workerProfile || workerProfile === null) {
        router.push("/worker/setup");
      } else {
        router.push("/worker");
      }
      return;
    }

    if (hasWorkerRole && !isWorkerActive) {
      if (hasWorkerProfile) {
        try {
          await switchRoleMutation.mutateAsync("worker");
          router.push("/worker");
        } catch (error) {
          handleError(error);
        }
      } else {
        router.push("/worker/setup");
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
        router.push("/chat");
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

  const workerButton = (
    <Button
      type="default"
      onClick={handleSwitchRole}
      loading={switchRoleMutation.isPending}
      block
    >
      {workerButtonLabel}
    </Button>
  );

  const authSectionDesktop =
    isAuthenticated && user ? (
      <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 0",
            cursor: "pointer",
          }}
        >
          <Avatar
            size="small"
            src={user.avatar || undefined}
            icon={
              !user.avatar && !getUserInitial() ? <UserOutlined /> : undefined
            }
            style={{
              backgroundColor: !user.avatar
                ? "var(--ant-color-primary)"
                : undefined,
            }}
          >
            {!user.avatar && getUserInitial()}
          </Avatar>
        </div>
      </Dropdown>
    ) : (
      <Space size="small">
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
      <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 0",
            cursor: "pointer",
          }}
        >
          <Avatar
            size="small"
            src={user.avatar || undefined}
            icon={
              !user.avatar && !getUserInitial() ? <UserOutlined /> : undefined
            }
            style={{
              backgroundColor: !user.avatar
                ? "var(--ant-color-primary)"
                : undefined,
            }}
          >
            {!user.avatar && getUserInitial()}
          </Avatar>
        </div>
      </Dropdown>
    ) : (
      <Space direction="vertical" style={{ width: "100%" }}>
        <Button type="text" onClick={handleOpenLogin} block>
          {t("auth.login")}
        </Button>
        <Button type="primary" onClick={handleOpenRegister} block>
          {t("auth.user.register")}
        </Button>
      </Space>
    );

  const mobilePopoverContent = (
    <div
      style={{
        minWidth: 260,
        padding: 8,
      }}
    >
      <Space direction="vertical" size="small" style={{ width: "100%" }}>
        <div style={{ width: "100%" }}>{workerButton}</div>

        <Divider style={{ margin: "8px 0" }} />

        <div style={{ width: "100%" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: "var(--ant-color-text-tertiary)",
              marginBottom: 4,
            }}
          >
            {t("header.currency")}
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
        </div>

        <div style={{ width: "100%" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: "var(--ant-color-text-tertiary)",
              marginBottom: 4,
            }}
          >
            {t("header.language")}
          </div>
          <LanguageSwitcher />
        </div>

        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 0",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: "var(--ant-color-text-tertiary)",
            }}
          >
            {t("header.theme")}
          </span>
          <ThemeToggle />
        </div>

        <Divider style={{ margin: "8px 0" }} />

        <div style={{ width: "100%" }}>{authSectionMobile}</div>
      </Space>
    </div>
  );

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
      <Link
        href="/"
        style={{
          fontSize: 20,
          fontWeight: "bold",
          color: "var(--ant-color-primary)",
          textDecoration: "none",
        }}
      >
        {t("home.logo")}
      </Link>

      <div style={{ flex: 1 }} />

      {!isMobile && (
        <Space size="middle">
          {workerButton}
          <SettingsPopover />
          {authSectionDesktop}
        </Space>
      )}

      {isMobile && (
        <Popover
          content={mobilePopoverContent}
          trigger="click"
          placement="bottomRight"
        >
          <Button icon={<MenuOutlined />} />
        </Popover>
      )}

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </AntHeader>
  );
}
