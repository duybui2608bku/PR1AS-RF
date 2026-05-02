"use client"

import { useEffect, useMemo, useRef } from "react"
import type { InfiniteData } from "@tanstack/react-query"
import { Spin } from "antd"
import type { FeedPage } from "@/lib/types/post"
import { AppRoute } from "@/lib/constants/routes"
import { PostCard } from "./post-card"
import { FeedSkeleton } from "./feed-skeleton"
import { FeedEmpty } from "./feed-empty"
import styles from "./post-list.module.scss"

interface PostListProps {
  currentUserId?: string
  hashtagBasePath?: string
  data: InfiniteData<FeedPage> | undefined
  fetchNextPage: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isLoading: boolean
  isError: boolean
}

export const PostList = ({
  currentUserId,
  hashtagBasePath = AppRoute.FEED,
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  isError,
}: PostListProps) => {
  const posts = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data]
  )

  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { rootMargin: "160px" }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, posts.length])

  if (isLoading) {
    return <FeedSkeleton />
  }

  if (isError) {
    return null
  }

  if (!posts.length) {
    return <FeedEmpty />
  }

  return (
    <div className={styles.list}>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          hashtagBasePath={hashtagBasePath}
        />
      ))}
      <div ref={loadMoreRef} style={{ height: 1 }} aria-hidden />
      {isFetchingNextPage ? (
        <div className={styles.moreLoading}>
          <Spin />
        </div>
      ) : null}
    </div>
  )
}
