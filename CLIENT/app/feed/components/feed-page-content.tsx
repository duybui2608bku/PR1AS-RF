"use client"

import { useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Alert, Button, Typography } from "antd"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "@/lib/stores/auth.store"
import { usePostsFeed } from "@/lib/hooks/use-posts-feed"
import { useErrorHandler } from "@/lib/hooks/use-error-handler"
import { Composer } from "./composer"
import { FeedTabs } from "./feed-tabs"
import { PostList } from "./post-list"
import { MeSidebar } from "./me-sidebar"
import { TrendingSidebar } from "./trending-sidebar"
import styles from "../page.module.scss"

export const FeedPageContent = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const { handleError } = useErrorHandler()

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
    const next = new URLSearchParams(searchParams.toString())
    next.delete("hashtag")
    const qs = next.toString()
    router.push(qs ? `/feed?${qs}` : "/feed")
  }

  return (
    <div className={styles.page}>
      <Typography.Title level={1} className={styles.srOnly}>
        {t("feed.title")}
      </Typography.Title>

      <div className={styles.feedTabsBand}>
        <div className={styles.feedTabsBandGrid}>
          <span className={styles.feedTabsBandSpacer} aria-hidden />
          <div className={styles.feedTabsBandMain}>
            <FeedTabs />
          </div>
          <span className={styles.feedTabsBandSpacer} aria-hidden />
        </div>
      </div>

      <div className={styles.grid}>
        <aside className={`${styles.sidebar} ${styles.sidebarLeft}`}>
          <MeSidebar />
        </aside>

        <main className={styles.main}>
          <div className={styles.mainStack}>
            {hashtag ? (
              <div className={styles.hashtagBanner}>
                <span className={styles.hashtagLabel}>
                  #{hashtag}
                </span>
                <Button type="link" onClick={handleClearHashtag}>
                  {t("feed.hashtag.clear")}
                </Button>
              </div>
            ) : null}

            <Composer />

            {feedQuery.isError ? (
              <Alert type="error" message={t("feed.loadError")} showIcon />
            ) : (
              <PostList
                currentUserId={user?.id}
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
          <TrendingSidebar />
        </aside>
      </div>
    </div>
  )
}
