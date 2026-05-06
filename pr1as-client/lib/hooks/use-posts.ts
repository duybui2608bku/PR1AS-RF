"use client"

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { queryKeys } from "@/lib/query-keys"
import { getErrorMessage } from "@/lib/utils/error-handler"
import { postService } from "@/services/post.service"
import type { CreatePostPayload, PostFeedParams, UpdatePostPayload } from "@/types"

export function useListFeed(params: Omit<PostFeedParams, "cursor"> = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.feed(params as Record<string, unknown>),
    queryFn: ({ pageParam }) =>
      postService.listFeed({ ...params, cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? (lastPage.next_cursor ?? undefined) : undefined,
  })
}

export function useGetPost(id: string) {
  return useQuery({
    queryKey: queryKeys.posts.detail(id),
    queryFn: () => postService.getPostById(id),
    enabled: !!id,
  })
}

export function useCreatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreatePostPayload) => postService.createPost(payload),
    onSuccess: () => {
      toast.success("Đăng bài thành công!")
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể đăng bài. Vui lòng thử lại."))
    },
  })
}

export function useUpdatePost(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdatePostPayload) => postService.updatePost(id, payload),
    onSuccess: () => {
      toast.success("Cập nhật bài viết thành công!")
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể cập nhật bài viết."))
    },
  })
}

export function useDeletePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => postService.deletePost(id),
    onSuccess: () => {
      toast.success("Đã xóa bài viết.")
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể xóa bài viết."))
    },
  })
}
