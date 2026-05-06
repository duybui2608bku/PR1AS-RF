"use client"

import Link from "next/link"
import { Hash, TrendingUp } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { useGetTrendingHashtags } from "@/lib/hooks/use-hashtags"

export function TrendingHashtags() {
  const { data: trending, isLoading } = useGetTrendingHashtags({ window: "24h", limit: 10 })

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Xu hướng hôm nay</h3>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      ) : (trending ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">Chưa có hashtag nào.</p>
      ) : (
        <ul className="space-y-1">
          {(trending ?? []).map((tag) => (
            <li key={tag.slug}>
              <Link
                href={`/posts?hashtag=${tag.slug}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <Hash className="size-3.5 text-primary" />
                  {tag.display}
                </span>
                <span className="text-xs text-muted-foreground">
                  {tag.post_count} bài
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
