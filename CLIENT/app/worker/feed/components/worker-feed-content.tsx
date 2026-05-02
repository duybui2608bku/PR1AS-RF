"use client"

import { useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Alert, Button, Typography } from "antd"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "@/lib/stores/auth.store"
import { usePostsFeed } from "@/lib/hooks/use-posts-feed"
import { useErrorHandler } from "@/lib/hooks/use-error-handler"
import { AppRoute, UserRole } from "@/lib/constants/routes"
import { buildFeedClearHashtagHref } from "@/app/feed/utils/feed-href"
import { FeedTabs } from "@/app/feed/components/feed-tabs"
import { PostList } from "@/app/feed/components/post-list"
import { TrendingSidebar } from "@/app/feed/components/trending-sidebar"
import styles from "../page.module.scss"

export const WorkerFeedContent = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const { handleError } = useErrorHandler()

  const lastActiveRole = (
    user as unknown as { last_active_role?: string } | null
  )?.last_active_role

  useEffect(() => {
    if (user && lastActiveRole !== UserRole.WORKER) {
      router.replace(AppRoute.HOME)
    }
  }, [user, lastActiveRole, router])

  const tab = searchParams.get("tab") === "mine" ? "mine" : "all"
  const hashtag = searchParams.get("hashtag")?.trim() || undefined

  const feedFilters = useMemo(
    () => ({
      authorId: tab === "mine" ? user?.id : undefined,
      hashtag,
    }),
    [tab, hashtag, user?.id]
  )

  const feedQuery = usePostsFeed(feedFilters)

  useEffect(() => {
    if (feedQuery.isError && feedQuery.error) {
      handleError(feedQuery.error)
    }
  }, [feedQuery.isError, feedQuery.error, handleError])

  const handleClearHashtag = () => {
    router.push(
      buildFeedClearHashtagHref(AppRoute.WORKER_FEED, searchParams)
    )
  }

  if (user && lastActiveRole !== UserRole.WORKER) {
    return null
  }

  return (
    <div className={styles.page}>
      <Typography.Title level={1} className={styles.srOnly}>
        {t("feed.workerHub.title")}
      </Typography.Title>

      <div className={styles.feedTabsBand}>
        <div className={styles.feedTabsBandGrid}>
          <span className={styles.feedTabsBandSpacer} aria-hidden />
          <div className={styles.feedTabsBandMain}>
            <FeedTabs basePath={AppRoute.WORKER_FEED} />
          </div>
          <span className={styles.feedTabsBandSpacer} aria-hidden />
        </div>
      </div>

      <div className={styles.grid}>
        <aside
          className={`${styles.sidebar} ${styles.sidebarLeft} ${styles.sidebarLeftEmpty}`}
          aria-hidden
        />

        <main className={styles.main}>
          <div className={styles.mainStack}>
            {hashtag ? (
              <div className={styles.hashtagBanner}>
                <span className={styles.hashtagLabel}>#{hashtag}</span>
                <Button type="link" onClick={handleClearHashtag}>
                  {t("feed.hashtag.clear")}
                </Button>
              </div>
            ) : null}

            {feedQuery.isError ? (
              <Alert type="error" message={t("feed.loadError")} showIcon />
            ) : (
              <PostList
                currentUserId={user?.id}
                hashtagBasePath={AppRoute.WORKER_FEED}
                data={feedQuery.data}
                fetchNextPage={feedQuery.fetchNextPage}
                hasNextPage={Boolean(feedQuery.hasNextPage)}
                isFetchingNextPage={feedQuery.isFetchingNextPage}
                isLoading={feedQuery.isLoading}
                isError={feedQuery.isError}
              />
            )}
          </div>
        </main>

        <aside className={`${styles.sidebar} ${styles.sidebarRight}`}>
          <TrendingSidebar basePath={AppRoute.WORKER_FEED} />
        </aside>
      </div>
    </div>
  )
}
