"use client"

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { queryKeys } from "@/lib/query-keys"
import { getErrorMessage } from "@/lib/utils/error-handler"
import { commentService } from "@/services/comment.service"
import type { CreateCommentPayload, UpdateCommentPayload } from "@/types"

const COMMENT_PAGE_SIZE = 20

const commentsQueryKey = (postId: string) =>
  queryKeys.posts.comments(postId, { limit: COMMENT_PAGE_SIZE })

export function usePostComments(postId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: commentsQueryKey(postId),
    queryFn: ({ pageParam }) =>
      commentService.listByPost(postId, {
        cursor: pageParam as string | undefined,
        limit: COMMENT_PAGE_SIZE,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? (lastPage.next_cursor ?? undefined) : undefined,
    enabled: !!postId && enabled,
  })
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateCommentPayload) =>
      commentService.create(postId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsQueryKey(postId) })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể gửi bình luận."))
    },
  })
}

export function useUpdateComment(postId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      commentId,
      body,
    }: {
      commentId: string
      body: string
    }) => commentService.update(commentId, { body } satisfies UpdateCommentPayload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsQueryKey(postId) })
      toast.success("Đã cập nhật bình luận.")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể cập nhật bình luận."))
    },
  })
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (commentId: string) => commentService.delete(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsQueryKey(postId) })
      toast.success("Đã xóa bình luận.")
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể xóa bình luận."))
    },
  })
}
