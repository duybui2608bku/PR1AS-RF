"use client"

import { useEffect, useRef } from "react"
import { Loader2, Newspaper } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { useListFeed } from "@/lib/hooks/use-posts"
import type { PostFeedParams } from "@/types"
import { PostCard } from "./post-card"

type Props = {
  params?: Omit<PostFeedParams, "cursor">
}

function PostSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
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
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useListFeed(params)

  const sentinelRef = useRef<HTMLDivElement>(null)

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
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <PostSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-center">
        <Newspaper className="mb-3 size-10 text-muted-foreground" />
        <p className="text-sm font-medium">Chưa có bài viết nào</p>
        <p className="mt-1 text-xs text-muted-foreground">Hãy là người đầu tiên đăng bài!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} />

      {isFetchingNextPage ? (
        <div className="flex justify-center py-4">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      {!hasNextPage && posts.length > 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          Đã hiển thị tất cả bài viết
        </p>
      ) : null}
    </div>
  )
}
