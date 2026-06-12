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
import { postRegistrationService } from "@/services/post-registration.service"
import type { CursorPaginatedResponse, PostPublic } from "@/types"

export function useTogglePostRegistration(postId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => postRegistrationService.toggle(postId),
    onSuccess: (result) => {
      const message = result.registered
        ? "Đăng ký thành công!"
        : "Đã hủy đăng ký."
      toast.success(message)

      // Optimistically update all feed caches that contain this post
      const updatePost = (post: PostPublic): PostPublic => {
        if (post.id !== postId) return post
        return {
          ...post,
          registrations_count: result.registrations_count,
          my_registration: result.registered,
        }
      }

      const updatePages = (old: CursorPaginatedResponse<PostPublic> | undefined) => {
        if (!old) return old
        return { ...old, data: old.data.map(updatePost) }
      }

      // Update all feed query caches
      queryClient.setQueriesData<{
        pages: CursorPaginatedResponse<PostPublic>[]
        pageParams: unknown[]
      }>(
        { queryKey: queryKeys.posts.all },
        (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => updatePages(page) ?? page),
          }
        }
      )

      // Invalidate the registered feed so it reflects the change
      queryClient.invalidateQueries({
        queryKey: queryKeys.posts.registeredFeed(),
      })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể cập nhật đăng ký."))
    },
  })
}

export function usePostRegistrations(postId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.posts.registrations(postId),
    queryFn: () => postRegistrationService.list(postId),
    enabled: enabled && !!postId,
    staleTime: 30_000,
  })
}

export function useListRegisteredFeed() {
  return useInfiniteQuery({
    queryKey: queryKeys.posts.registeredFeed(),
    queryFn: ({ pageParam }) =>
      postRegistrationService.listRegisteredFeed({
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? (lastPage.next_cursor ?? undefined) : undefined,
  })
}
