"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { postsApi } from "../api/posts.api"
import { FEED_CONSTANTS } from "../constants/feed.constants"

export interface PostsFeedFilters {
  authorId?: string
  hashtag?: string
  limit?: number
}

export const usePostsFeed = (filters: PostsFeedFilters) => {
  const limit = filters.limit ?? FEED_CONSTANTS.PAGE_LIMIT
  return useInfiniteQuery({
    queryKey: [
      "posts",
      "feed",
      {
        authorId: filters.authorId ?? null,
        hashtag: filters.hashtag ?? null,
        limit,
      },
    ],
    queryFn: async ({ pageParam }) => {
      return postsApi.getPosts({
        cursor: pageParam,
        limit,
        author_id: filters.authorId,
        hashtag: filters.hashtag,
      })
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.has_more && last.next_cursor ? last.next_cursor : undefined,
  })
}
