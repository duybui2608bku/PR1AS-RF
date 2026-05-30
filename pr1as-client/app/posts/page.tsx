"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { ChevronLeft } from "lucide-react"

import { SiteLayout } from "@/components/layout/site-layout"
import { CreatePostForm } from "@/components/post/create-post-form"
import { PostFeed } from "@/components/post/post-feed"
import { TrendingHashtags, TrendingHashtagsStrip } from "@/components/post/trending-hashtags"
import { isWorkerRoleActive } from "@/lib/auth/roles"
import { useAuthStore } from "@/lib/store/auth-store"

export default function PostsPage() {
  const searchParams = useSearchParams()
  const hashtag = searchParams.get("hashtag") ?? undefined
  const { isAuthenticated, user } = useAuthStore()
  const canCreatePost = isAuthenticated && !isWorkerRoleActive(user)

  const title = hashtag ? `#${hashtag}` : "Bảng tin"

  return (
    <SiteLayout>
      {/* Thanh slim chỉ hiện khi lọc hashtag (cần nút quay lại + tên tag).
          Feed chính không cần — SiteHeader đã là thanh app chung, tránh 2 header. */}
      {hashtag ? (
        <div
          className="sticky z-30 flex h-11 items-center gap-1 border-b bg-background/80 px-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:hidden"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 3.5rem)" }}
        >
          <Link
            href="/posts"
            aria-label="Quay lại bảng tin"
            className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-transform active:scale-90"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-6xl sm:px-4 sm:py-8">
        {/* Tiêu đề đầy đủ — chỉ desktop */}
        <div className="mb-6 hidden sm:block">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {hashtag ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Tất cả bài viết có hashtag{" "}
              <span className="font-medium text-primary">#{hashtag}</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Chia sẻ ý tưởng, cập nhật dự án và kết nối với cộng đồng
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          {/* Main Feed — edge-to-edge trên mobile, có khoảng cách trên desktop */}
          <div className="space-y-0 sm:space-y-4">
            {canCreatePost ? <CreatePostForm /> : null}
            <TrendingHashtagsStrip className="lg:hidden" />
            <PostFeed params={hashtag ? { hashtag } : {}} />
          </div>

          {/* Sidebar — desktop only */}
          <aside className="hidden space-y-4 lg:block">
            <TrendingHashtags />
          </aside>
        </div>
      </div>
    </SiteLayout>
  )
}
