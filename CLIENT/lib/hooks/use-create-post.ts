"use client"

import { isAxiosError } from "axios"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { postsApi } from "../api/posts.api"
import { useErrorHandler } from "./use-error-handler"
import { useStandardizedMutation } from "./use-standardized-mutation"
import type { CreatePostInput } from "../types/post"

export const useCreatePost = () => {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const { handleError, handleWarning } = useErrorHandler()

  return useStandardizedMutation(
    (input: CreatePostInput) => postsApi.createPost(input),
    {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["posts", "feed"] })
        void queryClient.invalidateQueries({ queryKey: ["posts", "stats", "me"] })
      },
      skipErrorNotification: true,
      onError: (error) => {
        if (isAxiosError(error) && error.response?.status === 429) {
          handleWarning(t("feed.rateLimit"))
          return
        }
        handleError(error)
      },
    }
  )
}
