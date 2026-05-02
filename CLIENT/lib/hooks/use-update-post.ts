"use client"

import { useQueryClient } from "@tanstack/react-query"
import { postsApi } from "../api/posts.api"
import { useStandardizedMutation } from "./use-standardized-mutation"
import type { UpdatePostInput } from "../types/post"

export const useUpdatePost = () => {
  const queryClient = useQueryClient()

  return useStandardizedMutation(
    ({ id, input }: { id: string; input: UpdatePostInput }) =>
      postsApi.updatePost(id, input),
    {
      onSuccess: (data) => {
        void queryClient.invalidateQueries({ queryKey: ["posts", "feed"] })
        void queryClient.setQueryData(["posts", "detail", data.id], data)
      },
    }
  )
}
