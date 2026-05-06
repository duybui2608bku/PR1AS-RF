"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { queryKeys } from "@/lib/query-keys"
import { useAuthStore } from "@/lib/store/auth-store"
import { getErrorMessage } from "@/lib/utils/error-handler"
import { reviewService } from "@/services/review.service"
import type { CreateReviewPayload, ReviewListQuery } from "@/types/review"

export function useMyReviews(query: ReviewListQuery = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.reviews.my(query as Record<string, unknown>),
    queryFn: () => reviewService.getMyReviews(query),
    enabled: isAuthenticated,
    staleTime: 30_000,
  })
}

export function useCreateReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateReviewPayload) =>
      reviewService.createReview(payload),
    onSuccess: () => {
      toast.success("Đã gửi đánh giá.")
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể gửi đánh giá."))
    },
  })
}
