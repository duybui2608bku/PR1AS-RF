"use client"

import { Card, List, Skeleton, Typography } from "antd"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"
import { AppRoute } from "@/lib/constants/routes"
import { useTrendingHashtags } from "@/lib/hooks/use-trending-hashtags"
import styles from "./trending-sidebar.module.scss"

interface TrendingSidebarProps {
  /** Đường dẫn feed khi chọn hashtag (client `/feed`, worker `/worker/feed`) */
  basePath?: string
}

export const TrendingSidebar = ({
  basePath = AppRoute.FEED,
}: TrendingSidebarProps) => {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data, isLoading, isError } = useTrendingHashtags({
    window: "24h",
    limit: 10,
  })

  const items = data?.items ?? []

  const handleClick = (slug: string) => {
    const next = new URLSearchParams(searchParams.toString())
    next.set("hashtag", slug)
    const qs = next.toString()
    router.push(qs ? `${basePath}?${qs}` : basePath)
  }

  return (
    <Card
      title={t("feed.sidebar.trendingTitle")}
      className={styles.card}
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 5 }} title={false} />
      ) : isError ? (
        <Typography.Text type="danger">{t("feed.sidebar.trendingError")}</Typography.Text>
      ) : (
        <List
          size="small"
          dataSource={items}
          locale={{ emptyText: t("feed.sidebar.trendingEmpty") }}
          renderItem={(item) => (
            <List.Item className={styles.listItem}>
              <Link
                href={`${basePath}?hashtag=${encodeURIComponent(item.slug)}`}
                className={styles.link}
                onClick={(e) => {
                  e.preventDefault()
                  handleClick(item.slug)
                }}
              >
                <span className={styles.display}>#{item.display}</span>
                <span className={styles.count}>
                  {t("feed.sidebar.postCount", { count: item.post_count })}
                </span>
              </Link>
            </List.Item>
          )}
        />
      )}
    </Card>
  )
}
