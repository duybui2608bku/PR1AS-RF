"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { queryKeys } from "@/lib/query-keys"
import { getErrorMessage } from "@/lib/utils/error-handler"
import { reactionService } from "@/services/reaction.service"
import type {
  PostPublic,
  ReactionSummaryPublic,
  ReactionType,
} from "@/types"

type FeedQueryData = {
  pages: { data: PostPublic[] }[]
  pageParams: unknown[]
}

const updateFeedCacheReaction = (
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  summary: ReactionSummaryPublic,
) => {
  queryClient.setQueriesData<FeedQueryData>(
    { queryKey: queryKeys.posts.all },
    (old) => {
      if (!old?.pages) return old
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          data: page.data.map((post) =>
            post.id === postId ? { ...post, reactions: summary } : post,
          ),
        })),
      }
    },
  )
  queryClient.setQueryData<PostPublic | undefined>(
    queryKeys.posts.detail(postId),
    (old) => (old ? { ...old, reactions: summary } : old),
  )
}

export function useTogglePostReaction(postId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      type,
      currentReaction,
    }: {
      type: ReactionType
      currentReaction: ReactionType | null
    }) => {
      if (currentReaction === type) {
        return reactionService.remove({
          target_type: "post",
          target_id: postId,
        })
      }
      return reactionService.upsert({
        target_type: "post",
        target_id: postId,
        type,
      })
    },
    onSuccess: (summary) => {
      updateFeedCacheReaction(queryClient, postId, summary)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể gửi cảm xúc."))
    },
  })
}
