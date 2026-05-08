"use client"

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { isWorkerRoleActive } from "@/lib/auth/roles"
import { queryKeys } from "@/lib/query-keys"
import { useAuthStore, type AuthUser } from "@/lib/store/auth-store"
import { getErrorMessage } from "@/lib/utils/error-handler"
import { postService } from "@/services/post.service"
import type { CreatePostPayload, PostFeedParams, UpdatePostPayload } from "@/types"

const WORKER_POST_PERMISSION_MESSAGE =
  "Worker chỉ có quyền reaction và bình luận trên bảng tin."

function assertCanManagePosts(user: AuthUser | null) {
  if (isWorkerRoleActive(user)) {
    throw new Error(WORKER_POST_PERMISSION_MESSAGE)
  }
}

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
  const user = useAuthStore((state) => state.user)

  return useMutation({
    mutationFn: (payload: CreatePostPayload) => {
      assertCanManagePosts(user)
      return postService.createPost(payload)
    },
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
  const user = useAuthStore((state) => state.user)

  return useMutation({
    mutationFn: (payload: UpdatePostPayload) => {
      assertCanManagePosts(user)
      return postService.updatePost(id, payload)
    },
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
  const user = useAuthStore((state) => state.user)

  return useMutation({
    mutationFn: (id: string) => {
      assertCanManagePosts(user)
      return postService.deletePost(id)
    },
    onSuccess: () => {
      toast.success("Đã xóa bài viết.")
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể xóa bài viết."))
    },
  })
}

export function useSetCommentsLock() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)

  return useMutation({
    mutationFn: ({ id, locked }: { id: string; locked: boolean }) => {
      assertCanManagePosts(user)
      return postService.setCommentsLock(id, locked)
    },
    onSuccess: (post) => {
      toast.success(
        post.comments_locked
          ? "Đã khóa bình luận của bài viết."
          : "Đã mở khóa bình luận của bài viết.",
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all })
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Không thể cập nhật trạng thái bình luận."),
      )
    },
  })
}
