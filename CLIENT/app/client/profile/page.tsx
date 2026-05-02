"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Typography,
  Button,
  Avatar,
  Skeleton,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  EditOutlined,
  SafetyOutlined,
  CheckCircleFilled,
  IdcardOutlined,
  CrownOutlined,
  SolutionOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  ContactsOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { userProfileApi } from "@/lib/api/user.api";
import { AuthGuard } from "@/lib/components/auth-guard";
import { AppRoute } from "@/lib/constants/routes";
import styles from "./profile.module.scss";

const { Title, Text } = Typography;

function ProfileContent() {
  const router = useRouter();
  const { t } = useTranslation();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: userProfileApi.getProfile,
    retry: false,
  });

  const handleEdit = useCallback(() => {
    router.push(AppRoute.CLIENT_PROFILE_EDIT);
  }, [router]);

  const handleVerifyEmail = useCallback(() => {
    if (!profile?.email) {
      return;
    }
    router.push(`/auth/verify-email?email=${encodeURIComponent(profile.email)}`);
  }, [router, profile]);

  const planLabel = useMemo(() => {
    if (!profile?.pricing_plan_code) {
      return null;
    }
    return (
      profile.pricing_plan_code.charAt(0).toUpperCase() +
      profile.pricing_plan_code.slice(1)
    );
  }, [profile?.pricing_plan_code]);

  const formatDate = useCallback((value?: string | null) => {
    if (!value) {
      return null;
    }
    return new Date(value).toLocaleString();
  }, []);

  const planStart = formatDate(profile?.pricing_started_at);
  const planExpiry = formatDate(profile?.pricing_expires_at);

  const isActive = profile?.status === "active";
  const displayName = profile?.full_name || profile?.email || "User";
  const notSet = t("profile.info.notSet");

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Card className={styles.loadingCard}>
          <Skeleton avatar={{ size: 120 }} active paragraph={{ rows: 6 }} />
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <Title level={2} className={styles.pageTitle}>
            {t("profile.title")}
          </Title>
          <Text className={styles.pageSubtitle}>{t("profile.info.title")}</Text>
        </div>
      </div>

      <Card className={styles.heroCard} variant="borderless" >
        <div className={styles.heroBackdrop} />
        <div className={styles.heroBody}>
          <div className={styles.heroLeft}>
            <div className={styles.avatarWrapper}>
              <Avatar
                size={120}
                src={profile?.avatar || undefined}
                icon={!profile?.avatar ? <UserOutlined /> : undefined}
                className={`${styles.avatar} ${
                  !profile?.avatar ? styles.avatarPlaceholder : ""
                }`}
              />
              <span
                className={`${styles.statusDot} ${
                  isActive ? styles.statusActive : ""
                }`}
                aria-hidden
              />
            </div>

            <div className={styles.heroIdentity}>
              <div className={styles.nameRow}>
                <Title level={3} className={styles.userName}>
                  {displayName}
                </Title>
                {profile?.verify_email ? (
                  <span
                    className={styles.verifiedBadge}
                    title={t("profile.info.verified")}
                  >
                    <CheckCircleFilled />
                  </span>
                ) : null}
              </div>

              {profile?.email ? (
                <Text className={styles.userEmail}>{profile.email}</Text>
              ) : null}

              {profile?.roles && profile.roles.length > 0 ? (
                <div className={styles.rolesRow}>
                  {profile.roles.map((role) => {
                    const isActiveRole = role === profile.last_active_role;
                    return (
                      <span
                        key={role}
                        className={`${styles.roleTag} ${
                          isActiveRole ? styles.activeRoleTag : ""
                        }`}
                      >
                        {role}
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>

          <div className={styles.heroActions}>
            <Button
              type="primary"
              size="large"
              icon={<EditOutlined />}
              onClick={handleEdit}
              className={styles.editButton}
            >
              {t("profile.editProfile")}
            </Button>
          </div>
        </div>
      </Card>

      <div className={styles.infoGrid}>
        <section className={styles.infoCard}>
          <header className={styles.infoCardHeader}>
            <span className={styles.infoCardIcon}>
              <ContactsOutlined />
            </span>
            <div>
              <Title level={5} className={styles.infoCardTitle}>
                {t("profile.info.title")}
              </Title>
              <Text className={styles.infoCardSubtitle}>
                {t("profile.info.fullName")} · {t("profile.info.email")} ·{" "}
                {t("profile.info.phone")}
              </Text>
            </div>
          </header>

          <div className={styles.infoList}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>
                <UserOutlined />
                {t("profile.info.fullName")}
              </span>
              <span
                className={`${styles.infoValue} ${
                  !profile?.full_name ? styles.infoValueMuted : ""
                }`}
              >
                {profile?.full_name || notSet}
              </span>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>
                <MailOutlined />
                {t("profile.info.email")}
              </span>
              <span className={styles.infoValue}>
                {profile?.email}
                {profile?.email && !profile?.verify_email ? (
                  <Button
                    type="link"
                    size="small"
                    icon={<SafetyOutlined />}
                    onClick={handleVerifyEmail}
                    className={styles.verifyButton}
                  >
                    {t("profile.info.unverified")}
                  </Button>
                ) : null}
              </span>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>
                <PhoneOutlined />
                {t("profile.info.phone")}
              </span>
              <span
                className={`${styles.infoValue} ${
                  !profile?.phone ? styles.infoValueMuted : ""
                }`}
              >
                {profile?.phone || notSet}
              </span>
            </div>
          </div>
        </section>

        <section className={styles.infoCard}>
          <header className={styles.infoCardHeader}>
            <span className={styles.infoCardIcon}>
              <SolutionOutlined />
            </span>
            <div>
              <Title level={5} className={styles.infoCardTitle}>
                {t("profile.info.status")}
              </Title>
              <Text className={styles.infoCardSubtitle}>
                {t("profile.info.lastActiveRole")} · {t("profile.info.userId")}
              </Text>
            </div>
          </header>

          <div className={styles.infoList}>
            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>
                <SafetyOutlined />
                {t("profile.info.status")}
              </span>
              <span className={styles.infoValue}>
                {profile?.status ? (
                  <span
                    className={`${styles.statusBadge} ${
                      isActive ? styles.statusActive : styles.statusInactive
                    }`}
                  >
                    <span className={styles.statusBadgeDot} aria-hidden />
                    {profile.status}
                  </span>
                ) : (
                  <span className={styles.infoValueMuted}>{notSet}</span>
                )}
              </span>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>
                <UserOutlined />
                {t("profile.info.lastActiveRole")}
              </span>
              <span
                className={`${styles.infoValue} ${
                  !profile?.last_active_role ? styles.infoValueMuted : ""
                }`}
              >
                {profile?.last_active_role
                  ? profile.last_active_role.charAt(0).toUpperCase() +
                    profile.last_active_role.slice(1)
                  : notSet}
              </span>
            </div>

            <div className={styles.infoRow}>
              <span className={styles.infoLabel}>
                <IdcardOutlined />
                {t("profile.info.userId")}
              </span>
              <span className={styles.infoValue}>
                <Text code className={styles.userIdText}>
                  {profile?.id}
                </Text>
              </span>
            </div>
          </div>
        </section>

        <section className={styles.planCard}>
          <header className={styles.planHeader}>
            <div className={styles.planTitleBlock}>
              <span className={styles.infoCardIcon}>
                <CrownOutlined />
              </span>
              <div>
                <Title level={5} className={styles.infoCardTitle}>
                  {t("profile.plan.title")}
                </Title>
                <Text className={styles.infoCardSubtitle}>
                  {t("profile.plan.description")}
                </Text>
              </div>
            </div>
            <span
              className={`${styles.planBadge} ${
                !planLabel ? styles.planBadgeMuted : ""
              }`}
            >
              <CrownOutlined />
              {planLabel || notSet}
            </span>
          </header>

          <div className={styles.planMetrics}>
            <div className={styles.planMetric}>
              <span className={styles.planMetricLabel}>
                <CalendarOutlined />
                {t("profile.plan.start")}
              </span>
              <span
                className={`${styles.planMetricValue} ${
                  !planStart ? styles.planMetricValueMuted : ""
                }`}
              >
                {planStart || notSet}
              </span>
            </div>

            <div className={styles.planMetric}>
              <span className={styles.planMetricLabel}>
                <ClockCircleOutlined />
                {t("profile.plan.expiry")}
              </span>
              <span
                className={`${styles.planMetricValue} ${
                  !planExpiry ? styles.planMetricValueMuted : ""
                }`}
              >
                {planExpiry || notSet}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
