"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { queryKeys } from "@/lib/query-keys"
import { getErrorMessage } from "@/lib/utils/error-handler"
import { feedbackService } from "@/services/feedback.service"

export function useMyFeedback(
  params: Parameters<typeof feedbackService.listMyFeedback>[0]
) {
  return useQuery({
    queryKey: queryKeys.feedback.mine(params),
    queryFn: () => feedbackService.listMyFeedback(params),
  })
}

export function useAdminFeedback(
  params: Parameters<typeof feedbackService.listFeedback>[0]
) {
  return useQuery({
    queryKey: queryKeys.feedback.admin(params),
    queryFn: () => feedbackService.listFeedback(params),
  })
}

export function useCreateFeedback() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: feedbackService.createFeedback,
    onSuccess: () => {
      toast.success("Đã gửi phản hồi. Cảm ơn bạn!")
      queryClient.invalidateQueries({ queryKey: queryKeys.feedback.all })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể gửi phản hồi.")),
  })
}

export function useUpdateFeedbackStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      admin_note,
    }: {
      id: string
      status: Parameters<typeof feedbackService.updateStatus>[1]["status"]
      admin_note?: string | null
    }) => feedbackService.updateStatus(id, { status, admin_note }),
    onSuccess: () => {
      toast.success("Đã cập nhật phản hồi.")
      queryClient.invalidateQueries({ queryKey: queryKeys.feedback.all })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể cập nhật phản hồi.")),
  })
}
