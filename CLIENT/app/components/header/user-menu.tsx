"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Dropdown, MenuProps } from "antd";
import { UserOutlined, MessageOutlined, WalletOutlined, BookOutlined, LogoutOutlined, SettingOutlined, BellOutlined, CrownOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useLogout } from "@/lib/hooks/use-auth";
import { useErrorHandler } from "@/lib/hooks/use-error-handler";
import { AppRoute, UserRole } from "@/lib/constants/routes";
import { getProfileRoute } from "@/lib/utils/profile-navigation";
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
        };
    }, [user]);

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

    const currentPlanLabel = useMemo(() => {
        const planCode = user?.pricing_plan_code || "standard";
        const formattedPlan = planCode.charAt(0).toUpperCase() + planCode.slice(1);
        return `Current plan: ${formattedPlan}`;
    }, [user?.pricing_plan_code]);

    const userMenuItems: MenuProps["items"] = useMemo(() => [
        {
            key: "profile",
            icon: <UserOutlined />,
            label: t("dashboard.header.profile"),
            onClick: handleNavigateToProfile,
        },
        {
            key: "messages",
            icon: <MessageOutlined />,
            label: t("dashboard.header.messages"),
            onClick: handleNavigateToChat,
        },
        {
            key: "notifications",
            icon: <BellOutlined />,
            label: t("notifications.title"),
            onClick: handleNavigateToNotifications,
        },
        {
            key: "wallet",
            icon: <WalletOutlined />,
            label: t("dashboard.header.wallet"),
            onClick: handleNavigateToWallet,
        },
        {
            key: "pricing-plan",
            icon: <CrownOutlined />,
            label: currentPlanLabel,
            onClick: handleNavigateToPricing,
        },
        {
            key: "client-bookings",
            icon: <BookOutlined />,
            label: t("dashboard.header.clientBookings"),
            onClick: handleNavigateToBookings,
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
    ], [t, handleNavigateToProfile, handleNavigateToChat, handleNavigateToNotifications, handleNavigateToWallet, handleNavigateToPricing, handleNavigateToBookings, handleLogout, currentPlanLabel]);

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
