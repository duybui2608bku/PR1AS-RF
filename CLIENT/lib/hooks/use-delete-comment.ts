"use client"

import { useQueryClient } from "@tanstack/react-query"
import { commentsApi } from "../api/comments.api"
import { useStandardizedMutation } from "./use-standardized-mutation"
import { getPostCommentsQueryKey } from "./use-post-comments"

export interface DeleteCommentVariables {
  postId: string
  commentId: string
}

export const useDeleteComment = () => {
  const queryClient = useQueryClient()

  return useStandardizedMutation(
    ({ commentId }: DeleteCommentVariables) =>
      commentsApi.deleteComment(commentId),
    {
      onSuccess: (_, variables) => {
        void queryClient.invalidateQueries({
          queryKey: getPostCommentsQueryKey(variables.postId),
        })
      },
    }
  )
}
