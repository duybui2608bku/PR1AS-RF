"use client"

import { useQueryClient } from "@tanstack/react-query"
import { commentsApi } from "../api/comments.api"
import { useStandardizedMutation } from "./use-standardized-mutation"
import { getPostCommentsQueryKey } from "./use-post-comments"

export interface UpdateCommentVariables {
  postId: string
  commentId: string
  body: string
}

export const useUpdateComment = () => {
  const queryClient = useQueryClient()

  return useStandardizedMutation(
    ({ commentId, body }: UpdateCommentVariables) =>
      commentsApi.updateComment(commentId, body),
    {
      onSuccess: (_, variables) => {
        void queryClient.invalidateQueries({
          queryKey: getPostCommentsQueryKey(variables.postId),
        })
      },
    }
  )
}
