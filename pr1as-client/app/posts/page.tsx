"use client"

import { useSearchParams } from "next/navigation"

import { SiteLayout } from "@/components/layout/site-layout"
import { CreatePostForm } from "@/components/post/create-post-form"
import { PostFeed } from "@/components/post/post-feed"
import { TrendingHashtags } from "@/components/post/trending-hashtags"
import { useAuthStore } from "@/lib/store/auth-store"

export default function PostsPage() {
  const searchParams = useSearchParams()
  const hashtag = searchParams.get("hashtag") ?? undefined
  const { isAuthenticated } = useAuthStore()

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            {hashtag ? `#${hashtag}` : "Bảng tin"}
          </h1>
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
          {/* Main Feed */}
          <div className="space-y-4">
            {isAuthenticated ? <CreatePostForm /> : null}
            <PostFeed params={hashtag ? { hashtag } : {}} />
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <TrendingHashtags />
          </aside>
        </div>
      </div>
    </SiteLayout>
  )
}
