"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, Loader2, Newspaper } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { AnnouncementRenderer } from "@/components/announcement"
import { SiteLayout } from "@/components/layout/site-layout"
import { CreatePostForm } from "@/components/post/create-post-form"
import { PostCard } from "@/components/post/post-card"
import { PostFeed } from "@/components/post/post-feed"
import {
  TrendingHashtags,
  TrendingHashtagsStrip,
} from "@/components/post/trending-hashtags"
import { ErrorBoundary } from "@/components/providers/error-boundary"
import { Skeleton } from "@/components/ui/skeleton"
import { isWorkerRoleActive } from "@/lib/auth/roles"
import { useListRegisteredFeed } from "@/lib/hooks/use-post-registrations"
import { useAuthStore } from "@/lib/store/auth-store"
import { useUIStore } from "@/lib/store/ui-store"
import { cn } from "@/lib/utils"

type TabKey = "all" | "mine" | "registered"

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
    </div>
  )
}

function RegisteredPostFeed() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useListRegisteredFeed()
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
      { rootMargin: "200px" }
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
        <p className="text-sm font-medium">Chưa đăng ký bài viết nào</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Các bài viết bạn đăng ký sẽ hiển thị ở đây
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-0 sm:space-y-4">
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
          Đã hiển thị tất cả bài viết đã đăng ký
        </p>
      ) : null}
    </div>
  )
}

export default function PostsPage() {
  const searchParams = useSearchParams()
  const hashtag = searchParams.get("hashtag") ?? undefined
  const { isAuthenticated, user } = useAuthStore()
  const canCreatePost = isAuthenticated && !isWorkerRoleActive(user)
  const isWorker = isWorkerRoleActive(user)

  const [activeTab, setActiveTab] = useState<TabKey>("all")
  const headerHidden = useUIStore((s) => s.headerHidden)

  // Reset tab to "all" whenever hashtag filter changes
  useEffect(() => {
    if (hashtag) setActiveTab("all")
  }, [hashtag])

  const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: "Tất cả bài viết" },
    ...(isAuthenticated && !isWorker
      ? [{ key: "mine" as TabKey, label: "Bài viết của tôi" }]
      : []),
    ...(isAuthenticated && isWorker
      ? [{ key: "registered" as TabKey, label: "Bài viết đã đăng ký" }]
      : []),
  ]

  const feedParams = hashtag ? { hashtag } : {}

  return (
    <SiteLayout>
      <AnnouncementRenderer placement="home_worker_popup" />
      <AnnouncementRenderer placement="home_worker_banner" />

      {/* Sticky tab bar — transitions top in sync with SiteHeader auto-hide */}
      <div
        className="sticky z-30 border-b bg-background/80 backdrop-blur transition-[top] duration-300 supports-[backdrop-filter]:bg-background/60"
        style={{
          top: headerHidden
            ? "env(safe-area-inset-top, 0px)"
            : "calc(env(safe-area-inset-top, 0px) + 3.5rem)",
        }}
      >
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "relative flex-1 py-2.5 text-sm font-medium transition-colors whitespace-nowrap text-center",
                  "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors",
                  activeTab === tab.key
                    ? "text-foreground after:bg-foreground"
                    : "text-muted-foreground hover:text-foreground after:bg-transparent"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hashtag breadcrumb strip — mobile only, when filtering */}
      {hashtag && activeTab === "all" ? (
        <div
          className="sticky z-20 flex h-11 items-center gap-1 border-b bg-background/80 px-2 backdrop-blur transition-[top] duration-300 supports-[backdrop-filter]:bg-background/60 sm:hidden"
          style={{
            top: headerHidden
              ? "calc(env(safe-area-inset-top, 0px) + 2.75rem)"
              : "calc(env(safe-area-inset-top, 0px) + 3.5rem + 2.75rem)",
          }}
        >
          <Link
            href="/posts"
            aria-label="Quay lại bảng tin"
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-transform active:scale-90"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <h1 className="truncate text-base font-semibold tracking-tight">
            #{hashtag}
          </h1>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-6xl sm:px-4 sm:py-6">
        {/* Desktop title — only on "all" tab when no hashtag */}
        {activeTab === "all" && !hashtag ? (
          <div className="mb-6 hidden sm:block">
            <h1 className="text-2xl font-bold tracking-tight">Bảng tin</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Chia sẻ ý tưởng, cập nhật dự án và kết nối với cộng đồng
            </p>
          </div>
        ) : null}
        {activeTab === "all" && hashtag ? (
          <div className="mb-6 hidden sm:block">
            <h1 className="text-2xl font-bold tracking-tight">#{hashtag}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tất cả bài viết có hashtag{" "}
              <span className="font-medium text-primary">#{hashtag}</span>
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          {/* Main feed area */}
          <div className="space-y-0 sm:space-y-4">
            {activeTab === "all" ? (
              <>
                {canCreatePost ? <CreatePostForm /> : null}
                <TrendingHashtagsStrip className="lg:hidden" />
                <PostFeed params={feedParams} />
              </>
            ) : null}

            {activeTab === "mine" && user ? (
              <PostFeed params={{ author_id: user.id }} />
            ) : null}

            {activeTab === "registered" ? <RegisteredPostFeed /> : null}
          </div>

          {/* Sticky sidebar — desktop only */}
          <aside className="hidden lg:block">
            {/* top = header (3.5rem) + tab bar (~2.75rem) + gap (1rem) */}
            <div className="sticky top-[7.25rem] space-y-4">
              <TrendingHashtags />
            </div>
          </aside>
        </div>
      </div>
    </SiteLayout>
  )
}
