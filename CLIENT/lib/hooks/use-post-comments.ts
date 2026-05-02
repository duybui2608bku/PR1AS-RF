"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { commentsApi } from "../api/comments.api"
import { FEED_CONSTANTS } from "../constants/feed.constants"

export const getPostCommentsQueryKey = (postId: string) =>
  [
    "posts",
    "comments",
    postId,
    { limit: FEED_CONSTANTS.COMMENT_LIMIT },
  ] as const

export const usePostComments = (postId: string, enabled: boolean) => {
  return useInfiniteQuery({
    queryKey: getPostCommentsQueryKey(postId),
    queryFn: async ({ pageParam }) => {
      return commentsApi.getComments(postId, {
        cursor: pageParam,
        limit: FEED_CONSTANTS.COMMENT_LIMIT,
      })
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.has_more && last.next_cursor ? last.next_cursor : undefined,
    enabled: Boolean(postId) && enabled,
  })
}
