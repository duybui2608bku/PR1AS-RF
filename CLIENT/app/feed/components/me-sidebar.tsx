"use client"

import { Avatar, Card, Skeleton, Typography } from "antd"
import { UserOutlined } from "@ant-design/icons"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "@/lib/stores/auth.store"
import { useMyPostStats } from "@/lib/hooks/use-my-post-stats"
import styles from "./me-sidebar.module.scss"

export const MeSidebar = () => {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const { data: stats, isLoading } = useMyPostStats(Boolean(user))

  const fullName =
    (user as { full_name?: string | null } | null)?.full_name?.trim() ||
    user?.name ||
    user?.email ||
    ""

  return (
    <Card className={styles.card}>
      <div className={styles.profile}>
        <Avatar size={56} src={user?.avatar ?? undefined} icon={<UserOutlined />} />
        <div className={styles.nameBlock}>
          <Typography.Title level={5} className={styles.name}>
            {fullName || "—"}
          </Typography.Title>
          <Typography.Text type="secondary" className={styles.subtitle}>
            {t("feed.sidebar.clientSubtitle")}
          </Typography.Text>
        </div>
      </div>
      <div className={styles.stats}>
        <Typography.Text type="secondary">
          {t("feed.sidebar.myPosts")}
        </Typography.Text>
        {isLoading ? (
          <Skeleton active title={false} paragraph={{ rows: 1, width: 48 }} />
        ) : (
          <Typography.Text strong className={styles.statValue}>
            {stats?.published_posts_count ?? 0}
          </Typography.Text>
        )}
      </div>
    </Card>
  )
}
