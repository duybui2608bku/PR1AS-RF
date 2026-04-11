"use client";

import { useState, memo, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Layout,
  Button,
  Space,
  Popover,
  Row,
  Col,
  Input,
} from "antd";
import {
  MenuOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useSwitchRole } from "@/lib/hooks/use-auth";
import { SettingsPopover } from "@/lib/components/settings-popover";
import { AuthModal } from "@/lib/components/auth-modal";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import { AppRoute, UserRole } from "@/lib/constants/routes";
import { Breakpoint, ScrollAmount } from "@/lib/constants/ui.constants";
import { useWindowSize } from "@/lib/hooks/use-window-size";
import { useScroll } from "@/lib/hooks/use-scroll";
import { CategoryTabs } from "@/app/components/category-tabs";
import { UserMenu } from "./header/user-menu";
import { MobileMenu } from "./header/mobile-menu";
import styles from "./header.module.scss";

const { Header: AntHeader } = Layout;

const AUTH_MODAL_TABS = ["login", "register"] as const;

interface HeaderProps {
  showCategoryTabs?: boolean;
  /** When provided (MainLayout), driven by viewport sentinel — avoids scroll↔layout jitter. */
  compact?: boolean;
}

const HeaderComponent = ({ showCategoryTabs = true, compact: compactControlled }: HeaderProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const switchRoleMutation = useSwitchRole();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<typeof AUTH_MODAL_TABS[number]>(
    AUTH_MODAL_TABS[0]
  );
  const [searchValue, setSearchValue] = useState("");

  const { width } = useWindowSize();
  const isMobile = width ? width < Breakpoint.MOBILE : false;
  const headerScrollControlled = compactControlled !== undefined;
  const isScrolledFromScroll = useScroll(
    ScrollAmount.HEADER_SCROLL_ENTER,
    ScrollAmount.HEADER_SCROLL_EXIT,
    { disabled: headerScrollControlled }
  );
  const isScrolled = headerScrollControlled ? compactControlled! : isScrolledFromScroll;

  const { handleError } = useErrorHandler();

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

  const handleOpenLogin = useCallback(() => {
    setAuthModalTab("login");
    setAuthModalOpen(true);
  }, []);

  const handleOpenRegister = useCallback(() => {
    setAuthModalTab("register");
    setAuthModalOpen(true);
  }, []);

  const handleSearch = useCallback(() => {
    const keyword = searchValue.trim();
    if (!keyword) {
      router.push("/services");
      return;
    }
    router.push(`/services?search=${encodeURIComponent(keyword)}`);
  }, [router, searchValue]);

  const workerButton = useMemo(() => (
    <Button
      type="primary"
      onClick={handleSwitchRole}
      loading={switchRoleMutation.isPending}
    >
      {workerButtonLabel}
    </Button>
  ), [handleSwitchRole, switchRoleMutation.isPending, workerButtonLabel]);


  const authSectionDesktop = useMemo(() =>
    isAuthenticated && user ? (
      <Space size="middle">
        <UserMenu />
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
    ), [isAuthenticated, user, handleOpenLogin, handleOpenRegister, t]);

  const authSectionMobile = useMemo(() =>
    isAuthenticated && user ? (
      <Space size="middle">
         <UserMenu />
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
    ), [isAuthenticated, user, handleOpenLogin, handleOpenRegister, t]);

  return (
    <AntHeader
      className={`${styles.header} ${isScrolled ? styles.scrolled : ""}`}
    >
      <div className={styles.headerTop}>
        {showCategoryTabs && isScrolled && (
          <div className={styles.headerTabsInline}>
            <CategoryTabs forceCompact className={styles.headerTabsInlineContent} />
          </div>
        )}
        <Row justify="space-between" align="middle" wrap={false} className={styles.headerRow}>
          <Col flex="none" className={styles.logoCol}>
            <Link href={AppRoute.HOME} className={styles.logoLink}>
              {t("home.logo")}
            </Link>
          </Col>
          <Col flex="auto" className={styles.actionsCol}>
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
                  content={
                      <MobileMenu
                          isAdmin={userData.isAdmin}
                          workerButton={workerButton}
                          authSectionMobile={authSectionMobile}
                      />
                  }
                  trigger="click"
                  placement="bottomRight"
                >
                  <Button type="text" icon={<MenuOutlined />} />
                </Popover>
              )}
            </Space>
          </Col>
        </Row>
      </div>
      {showCategoryTabs && !isScrolled && (
        <div className={styles.headerTabs}>
          <CategoryTabs forceCompact={false} className={styles.headerTabsContent} />
        </div>
      )}
      {showCategoryTabs && !isScrolled && (
        <div className={styles.headerSearchRow}>
          <div className={styles.headerSearch}>
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onPressEnter={handleSearch}
              placeholder={t("header.searchPlaceholder", { defaultValue: "Tìm kiếm dịch vụ..." })}
              bordered={false}
              className={styles.headerSearchInput}
            />
            <Button
              type="primary"
              shape="circle"
              icon={<SearchOutlined />}
              aria-label={t("header.search", { defaultValue: "Tìm kiếm" })}
              onClick={handleSearch}
              className={styles.headerSearchButton}
            />
          </div>
        </div>
      )}

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authModalTab}
      />
    </AntHeader>
  );
};

export const Header = memo(HeaderComponent);
