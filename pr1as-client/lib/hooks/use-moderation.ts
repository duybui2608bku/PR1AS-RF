"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { queryKeys } from "@/lib/query-keys"
import { getErrorMessage } from "@/lib/utils/error-handler"
import { moderationService } from "@/services/moderation.service"

export function useBlockedUsers() {
  return useQuery({
    queryKey: queryKeys.moderation.blocks,
    queryFn: moderationService.listBlocks,
  })
}

export function useBlockUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: moderationService.blockUser,
    onSuccess: () => {
      toast.success("Da chan nguoi dung.")
      queryClient.invalidateQueries({ queryKey: queryKeys.moderation.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all })
    },
    onError: (error) => toast.error(getErrorMessage(error, "Khong the chan.")),
  })
}

export function useUnblockUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: moderationService.unblockUser,
    onSuccess: () => {
      toast.success("Da bo chan nguoi dung.")
      queryClient.invalidateQueries({ queryKey: queryKeys.moderation.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all })
    },
    onError: (error) => toast.error(getErrorMessage(error, "Khong the bo chan.")),
  })
}

export function useReportPost() {
  return useMutation({
    mutationFn: moderationService.reportPost,
    onSuccess: () => toast.success("Đã gửi báo cáo bài viết."),
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể gửi báo cáo.")),
  })
}

export function useReportWorker() {
  return useMutation({
    mutationFn: moderationService.reportWorker,
    onSuccess: () => toast.success("Đã gửi báo cáo worker."),
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể gửi báo cáo.")),
  })
}

export function useAdminReports(params: Parameters<typeof moderationService.listReports>[0]) {
  return useQuery({
    queryKey: queryKeys.moderation.reports(params),
    queryFn: () => moderationService.listReports(params),
  })
}

export function useUpdateReportStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      admin_note,
    }: {
      id: string
      status: Parameters<typeof moderationService.updateReportStatus>[1]["status"]
      admin_note?: string | null
    }) => moderationService.updateReportStatus(id, { status, admin_note }),
    onSuccess: () => {
      toast.success("Đã cập nhật báo cáo.")
      queryClient.invalidateQueries({ queryKey: queryKeys.moderation.all })
    },
  })
}

export function useCreateRestriction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: moderationService.createRestriction,
    onSuccess: () => {
      toast.success("Đã tạo lệnh cấm.")
      queryClient.invalidateQueries({ queryKey: queryKeys.moderation.all })
    },
  })
}

export function useAdminDeletePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: moderationService.deletePostAsAdmin,
    onSuccess: () => {
      toast.success("Đã xóa bài viết.")
      queryClient.invalidateQueries({ queryKey: queryKeys.moderation.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all })
    },
  })
}
