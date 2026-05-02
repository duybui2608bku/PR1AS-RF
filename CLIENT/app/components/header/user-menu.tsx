"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Avatar, Dropdown, MenuProps, Tooltip } from "antd";
import { UserOutlined, LogoutOutlined, SettingOutlined, InfoCircleOutlined, CalendarOutlined } from "@ant-design/icons";
import type { StaticImageData } from "next/image";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useLogout } from "@/lib/hooks/use-auth";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import { AppRoute, UserRole } from "@/lib/constants/routes";
import { getProfileRoute } from "@/lib/utils/profile-navigation";
import userIcon from "@/assets/icon/user.svg";
import messageIcon from "@/assets/icon/mess.png";
import notificationIcon from "@/assets/icon/noti.png";
import walletIcon from "@/assets/icon/wallets.png";
import bookingsIcon from "@/assets/icon/bookings.png";
import crownIcon from "@/assets/icon/crown.png";
import styles from "../header.module.scss";

export const UserMenu = () => {
    const { t } = useTranslation();
    const router = useRouter();
    const { user } = useAuthStore();
    const logoutMutation = useLogout();
    const { handleError } = useErrorHandler();

    const userData = useMemo(() => {
        const lastActiveRole = (user as unknown as { last_active_role?: string })?.last_active_role;
        const userRoles = (user as unknown as { roles?: string[] })?.roles || [];
        
        return {
            isAdmin: userRoles.includes(UserRole.ADMIN),
            isWorkerActive: lastActiveRole === UserRole.WORKER,
            isStandardPlan: user?.pricing_plan_code === "standard",
        };
    }, [user, user?.pricing_plan_code]);

    const chatBlockedMessage = t("chat.bookingConfirmationRequired");
    const profileLabel = t("dashboard.header.profile");
    const messagesLabel = t("dashboard.header.messages");
    const notificationsLabel = t("notifications.title");
    const walletLabel = t("dashboard.header.wallet");
    const bookingsLabel = t("dashboard.header.clientBookings");

    const renderMenuIcon = useCallback((src: string | StaticImageData, alt: string) => (
        <Image src={src} alt={alt} width={30} height={30} className={styles.menuItemIconImage} />
    ), []);

    const handleLogout = useCallback(async () => {
        try {
            await logoutMutation.mutateAsync();
        } catch (error) {
            handleError(error);
        }
    }, [logoutMutation, handleError]);

    const handleNavigateToAdminDashboard = useCallback(() => {
        router.push(AppRoute.ADMIN_DASHBOARD);
    }, [router]);

    const getUserInitial = useCallback((): string => {
        const displayName = user?.name || user?.email || "";
        return displayName.charAt(0).toUpperCase();
    }, [user]);

    const handleNavigateToProfile = useCallback(() => {
        const profileRoute = getProfileRoute(user);
        router.push(profileRoute);
    }, [user, router]);

    const handleNavigateToChat = useCallback(() => {
        router.push(AppRoute.CHAT);
    }, [router]);

    const handleNavigateToNotifications = useCallback(() => {
        router.push(AppRoute.NOTIFICATIONS);
    }, [router]);

    const handleNavigateToPricing = useCallback(() => {
        router.push(AppRoute.PRICING);
    }, [router]);

    const handleNavigateToWallet = useCallback(() => {
        if (userData.isWorkerActive) {
            router.push(AppRoute.WORKER_WALLET);
        } else {
            router.push(AppRoute.CLIENT_WALLET);
        }
    }, [router, userData.isWorkerActive]);

    const handleNavigateToBookings = useCallback(() => {
        if (userData.isWorkerActive) {
            router.push(AppRoute.WORKER_BOOKINGS);
        } else {
            router.push(AppRoute.CLIENT_BOOKINGS);
        }
    }, [router, userData.isWorkerActive]);

    const handleNavigateToWorkerSchedule = useCallback(() => {
        router.push(AppRoute.WORKER_BOOKINGS_SCHEDULE);
    }, [router]);

    const currentPlanLabel = useMemo(() => {
        const planCode = user?.pricing_plan_code || "standard";
        const formattedPlan = planCode.charAt(0).toUpperCase() + planCode.slice(1);
        return `Current plan: ${formattedPlan}`;
    }, [user?.pricing_plan_code]);

    const userMenuItems: MenuProps["items"] = useMemo(() => [
        {
            key: "profile",
            icon: renderMenuIcon(userIcon, profileLabel),
            label: profileLabel,
            onClick: handleNavigateToProfile,
        },
        {
            key: "messages",
            icon: renderMenuIcon(messageIcon, messagesLabel),
            label: userData.isStandardPlan ? (
                <Tooltip title={chatBlockedMessage}>
                    <span>
                        {messagesLabel} <InfoCircleOutlined />
                    </span>
                </Tooltip>
            ) : messagesLabel,
            onClick: handleNavigateToChat,
            disabled: userData.isStandardPlan,
        },
        {
            key: "notifications",
            icon: renderMenuIcon(notificationIcon, notificationsLabel),
            label: notificationsLabel,
            onClick: handleNavigateToNotifications,
        },
        {
            key: "wallet",
            icon: renderMenuIcon(walletIcon, walletLabel),
            label: walletLabel,
            onClick: handleNavigateToWallet,
        },
        {
            key: "pricing-plan",
            icon: renderMenuIcon(crownIcon, currentPlanLabel),
            label: currentPlanLabel,
            onClick: handleNavigateToPricing,
        },
        {
            key: "client-bookings",
            icon: renderMenuIcon(bookingsIcon, bookingsLabel),
            label: bookingsLabel,
            onClick: handleNavigateToBookings,
        },
        ...(userData.isWorkerActive
            ? [
                  {
                      key: "worker-schedule",
                      icon: <CalendarOutlined />,
                      label: t("booking.table.schedule"),
                      onClick: handleNavigateToWorkerSchedule,
                  },
              ]
            : []),
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
    ], [renderMenuIcon, profileLabel, messagesLabel, notificationsLabel, walletLabel, bookingsLabel, handleNavigateToProfile, handleNavigateToChat, handleNavigateToNotifications, handleNavigateToWallet, handleNavigateToPricing, handleNavigateToBookings, handleNavigateToWorkerSchedule, handleLogout, currentPlanLabel, userData.isStandardPlan, userData.isWorkerActive, chatBlockedMessage]);

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

    const items = userData.isAdmin ? adminMenuItems : userMenuItems;

    return (
        <Dropdown menu={{ items }} placement="bottomRight" trigger={["hover"]}>
            <div className={styles.avatarWrapper}>
                <Avatar
                    size={32}
                    src={user?.avatar}
                    icon={!user?.avatar ? <UserOutlined /> : undefined}
                    className={!user?.avatar ? styles.placeholderAvatar : undefined}
                >
                    {!user?.avatar && getUserInitial()}
                </Avatar>
            </div>
        </Dropdown>
    );
};
