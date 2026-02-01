"use client";

import { useEffect, useState, memo, useMemo, useCallback } from "react";
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
  Row,
  Col,
} from "antd";
import type { MenuProps } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  MenuOutlined,
  MessageOutlined,
  SettingOutlined,
  WalletOutlined,
  BookOutlined,
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
import { Breakpoint, ScrollAmount } from "@/lib/constants/ui.constants";
import styles from "./header.module.scss";

const { Header: AntHeader } = Layout;

const AUTH_MODAL_TABS = ["login", "register"] as const;

const HeaderComponent = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const logoutMutation = useLogout();
  const switchRoleMutation = useSwitchRole();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<typeof AUTH_MODAL_TABS[number]>(
    AUTH_MODAL_TABS[0]
  );
  const [isMobile, setIsMobile] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { currency, setCurrency, currencies, getCurrencyLabel } = useCurrency();
  const { handleError } = useErrorHandler();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setIsMobile(window.innerWidth < Breakpoint.MOBILE);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > ScrollAmount.HEADER_BLUR_THRESHOLD);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const userData = useMemo(() => {
    const lastActiveRole = (user as unknown as { last_active_role?: string })
      ?.last_active_role;
    const userRoles = (user as unknown as { roles?: string[] })?.roles || [];
    const workerProfile = (
      user as unknown as {
        worker_profile?: unknown | null;
      }
    )?.worker_profile;

    return {
      lastActiveRole,
      userRoles,
      workerProfile,
      hasWorkerRole: userRoles.includes(UserRole.WORKER),
      isWorkerActive: lastActiveRole === UserRole.WORKER,
      hasWorkerProfile: workerProfile && workerProfile !== null,
      isAdmin: userRoles.includes(UserRole.ADMIN),
    };
  }, [user]);

  const workerButtonLabel = useMemo(() => {
    if (userData.isWorkerActive) {
      return t("header.hireService");
    } else if (userData.hasWorkerProfile) {
      return t("header.myServices");
    } else {
      return t("header.becomeWorker");
    }
  }, [userData.isWorkerActive, userData.hasWorkerProfile, t]);

  const handleSwitchRole = useCallback(async () => {
    if (!isAuthenticated || !user) {
      handleOpenLogin();
      return;
    }

    if (userData.isWorkerActive) {
      try {
        await switchRoleMutation.mutateAsync(UserRole.CLIENT);
        router.push(AppRoute.HOME);
      } catch (error) {
        handleError(error);
      }
      return;
    }

    if (!userData.hasWorkerRole) {
      if (!userData.workerProfile || userData.workerProfile === null) {
        router.push(AppRoute.WORKER_SETUP);
      } else {
        router.push(AppRoute.HOME);
      }
      return;
    }

    if (userData.hasWorkerRole && !userData.isWorkerActive) {
      if (userData.hasWorkerProfile) {
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
  }, [isAuthenticated, user, userData, switchRoleMutation, router, handleError]);

  const getUserInitial = useCallback((): string => {
    const displayName = user?.name || user?.email || "";
    return displayName.charAt(0).toUpperCase();
  }, [user]);

  const handleLogout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      handleError(error);
    }
  }, [logoutMutation, handleError]);

  const handleOpenLogin = useCallback(() => {
    setAuthModalTab("login");
    setAuthModalOpen(true);
  }, []);

  const handleOpenRegister = useCallback(() => {
    setAuthModalTab("register");
    setAuthModalOpen(true);
  }, []);

  const handleNavigateToAdminDashboard = useCallback(() => {
    router.push(AppRoute.ADMIN_DASHBOARD);
  }, [router]);

  const userMenuItems: MenuProps["items"] = useMemo(() => [
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
          userData.isWorkerActive ? router.push(AppRoute.WORKER_WALLET) : router.push(AppRoute.CLIENT_WALLET);
      },
    },
    {
      key: "client-bookings",
      icon: <BookOutlined />,
      label: t("dashboard.header.clientBookings"),
      onClick: () => {
        userData.isWorkerActive ? router.push(AppRoute.WORKER_BOOKINGS) : router.push(AppRoute.CLIENT_BOOKINGS);
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
  ], [t, user, router, handleLogout]);

  const adminMenuItems: MenuProps["items"] = useMemo(() => [
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
  ], [t, handleNavigateToAdminDashboard, handleLogout]);

  const workerButton = useMemo(() => (
    <Button
      type="primary"
      onClick={handleSwitchRole}
      loading={switchRoleMutation.isPending}
    >
      {workerButtonLabel}
    </Button>
  ), [handleSwitchRole, switchRoleMutation.isPending, workerButtonLabel]);

  const renderAvatarDropdown = useCallback((menuItems: MenuProps["items"]) => (
    <Dropdown
      menu={{ items: menuItems }}
      placement="bottomRight"
      trigger={["hover"]}
    >
      <div className={styles.avatarWrapper}>
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
  ), [user, getUserInitial]);

  const authSectionDesktop = useMemo(() =>
    isAuthenticated && user ? (
      <Space size="middle">
        {renderAvatarDropdown(userData.isAdmin ? adminMenuItems : userMenuItems)}
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
    ), [isAuthenticated, user, renderAvatarDropdown, userData.isAdmin, adminMenuItems, userMenuItems, handleOpenLogin, handleOpenRegister, t]);

  const authSectionMobile = useMemo(() =>
    isAuthenticated && user ? (
      <Space size="middle">
        {renderAvatarDropdown(userData.isAdmin ? adminMenuItems : userMenuItems)}
      </Space>
    ) : (
      <Space orientation="vertical" className={styles.authSectionFullWidth}>
        <Button type="primary" onClick={handleOpenLogin} block>
          {t("auth.login")}
        </Button>
        <Button onClick={handleOpenRegister} block>
          {t("auth.user.register")}
        </Button>
      </Space>
    ), [isAuthenticated, user, renderAvatarDropdown, userData.isAdmin, adminMenuItems, userMenuItems, handleOpenLogin, handleOpenRegister, t]);

  const mobilePopoverContent = (
    <div className={styles.popoverContent}>
      {!userData.isAdmin && (
        <div className={styles.workerButtonBlock}>{workerButton}</div>
      )}
      {!userData.isAdmin && <SettingsPopover />}
      <Divider className={styles.dividerSpacing} />

      <Space direction="vertical" size="small" className={styles.settingsBlock}>
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

      <Space direction="vertical" size="small" className={styles.settingsBlock}>
        <span className={styles.settingsLabel}>{t("header.language")}</span>
        <LanguageSwitcher />
      </Space>

      <Divider className={styles.dividerSpacing} />

      <Space direction="vertical" size="small" className={styles.settingsBlock}>
        <span className={styles.settingsLabel}>{t("header.theme")}</span>
        <ThemeToggle />
      </Space>

      <Divider className={styles.dividerSpacing} />

      {authSectionMobile}
    </div>
  );

  return (
    <AntHeader
      className={`${styles.header} ${isScrolled ? styles.scrolled : ""}`}
    >
      <Row justify="space-between" align="middle" wrap={false} className={styles.headerRow}>
        <Col flex="none">
          <Link href={AppRoute.HOME} className={styles.logoLink}>
            {t("home.logo")}
          </Link>
        </Col>
        <Col flex="auto">
          <Space className={styles.actionsRow} size="middle">
            {!isMobile && (
              <>
                {!userData.isAdmin && workerButton}
                {!userData.isAdmin && <SettingsPopover />}
                {authSectionDesktop}
              </>
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
          </Space>
        </Col>
      </Row>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </AntHeader>
  );
};

export const Header = memo(HeaderComponent);
