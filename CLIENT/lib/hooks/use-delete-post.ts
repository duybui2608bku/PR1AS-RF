"use client"

import type { InfiniteData } from "@tanstack/react-query"
import { useQueryClient } from "@tanstack/react-query"
import { postsApi } from "../api/posts.api"
import { useStandardizedMutation } from "./use-standardized-mutation"
import type { FeedPage } from "../types/post"
import { getPostCommentsQueryKey } from "./use-post-comments"

export const useDeletePost = () => {
  const queryClient = useQueryClient()

  return useStandardizedMutation((id: string) => postsApi.deletePost(id), {
    onSuccess: (_, postId) => {
      queryClient.setQueriesData<InfiniteData<FeedPage>>(
        { queryKey: ["posts", "feed"] },
        (old) => {
          if (!old?.pages) {
            return old
          }
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.filter((p) => p.id !== postId),
            })),
          }
        }
      )
      void queryClient.invalidateQueries({ queryKey: ["posts", "stats", "me"] })
      void queryClient.removeQueries({
        queryKey: getPostCommentsQueryKey(postId),
      })
    },
  })
}
