"use client"

import { useQueryClient } from "@tanstack/react-query"
import { commentsApi } from "../api/comments.api"
import { useStandardizedMutation } from "./use-standardized-mutation"
import { getPostCommentsQueryKey } from "./use-post-comments"

export interface CreateCommentVariables {
  postId: string
  body: string
  /** ID comment gốc (thread root). `null` = bình luận top-level mới */
  parentCommentId: string | null
}

export const useCreateComment = () => {
  const queryClient = useQueryClient()

  return useStandardizedMutation(
    ({ postId, body, parentCommentId }: CreateCommentVariables) =>
      commentsApi.createComment(postId, {
        body,
        parent_comment_id: parentCommentId,
      }),
    {
      onSuccess: (_, variables) => {
        void queryClient.invalidateQueries({
          queryKey: getPostCommentsQueryKey(variables.postId),
        })
      },
    }
  )
}
