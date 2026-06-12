"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Newspaper } from "lucide-react"
import { useTranslations } from "next-intl"

import { ErrorBoundary } from "@/components/providers/error-boundary"
import { Skeleton } from "@/components/ui/skeleton"
import { useListFeed } from "@/lib/hooks/use-posts"
import { cn } from "@/lib/utils"
import type { PostFeedParams } from "@/types"
import { PostCard } from "./post-card"

type Props = {
  params?: Omit<PostFeedParams, "cursor">
}

function PostSkeleton() {
  return (
    <div className="space-y-3 border-b bg-card p-4 sm:rounded-xl sm:border sm:shadow-sm">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  )
}

export function PostFeed({ params = {} }: Props) {
  const t = useTranslations("PostFeed")
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useListFeed(params)

  const sentinelRef = useRef<HTMLDivElement>(null)

  // Pull-to-refresh (mobile): kéo xuống ở đỉnh trang để làm mới feed.
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const pullStartY = useRef<number | null>(null)
  const pulling = useRef(false)

  const handleTouchStart = (event: React.TouchEvent) => {
    if (window.scrollY <= 0 && !refreshing) {
      pullStartY.current = event.touches[0]?.clientY ?? null
      pulling.current = true
    }
  }
  const handleTouchMove = (event: React.TouchEvent) => {
    if (!pulling.current || pullStartY.current === null) return
    const dy = (event.touches[0]?.clientY ?? 0) - pullStartY.current
    if (dy > 0) setPull(Math.min(dy * 0.5, 90))
    else {
      pulling.current = false
      setPull(0)
    }
  }
  const handleTouchEnd = async () => {
    if (!pulling.current) return
    pulling.current = false
    if (pull > 60) {
      setRefreshing(true)
      setPull(48)
      try {
        await refetch()
      } finally {
        setRefreshing(false)
        setPull(0)
      }
    } else {
      setPull(0)
    }
  }

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: "200px" },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const posts = data?.pages.flatMap((page) => page.data) ?? []

  if (isLoading) {
    return (
      <div className="space-y-0 sm:space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center border-b bg-card py-16 text-center sm:rounded-xl sm:border">
        <Newspaper className="mb-3 size-10 text-muted-foreground" />
        <p className="text-sm font-medium">{t("emptyTitle")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("emptyDesc")}</p>
      </div>
    )
  }

  return (
    <div
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Chỉ báo pull-to-refresh */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-9 flex justify-center"
        style={{ transform: `translateY(${pull}px)`, opacity: Math.min(pull / 60, 1) }}
      >
        <Loader2
          className={cn("size-5 text-muted-foreground", refreshing && "animate-spin")}
        />
      </div>

      <div
        className="space-y-0 sm:space-y-4"
        style={{
          transform: `translateY(${pull}px)`,
          transition: pulling.current ? "none" : "transform 0.2s ease-out",
        }}
      >
        {posts.map((post) => (
          <ErrorBoundary key={post.id} resetKeys={[post.id]}>
            <PostCard post={post} />
          </ErrorBoundary>
        ))}

        <div ref={sentinelRef} />

        {isFetchingNextPage ? (
          <div className="flex justify-center py-4">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : null}

        {!hasNextPage && posts.length > 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {t("end")}
          </p>
        ) : null}
      </div>
    </div>
  )
}
