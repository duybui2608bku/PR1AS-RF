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
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: moderationService.reportPost,
    onSuccess: (report, variables) => {
      toast.success("Đã gửi báo cáo bài viết.")
      queryClient.setQueryData(
        queryKeys.moderation.openPostReport(variables.post_id),
        report ?? null
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.moderation.all })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể gửi báo cáo.")),
  })
}

export function useOpenPostReport(postId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.moderation.openPostReport(postId),
    queryFn: () => moderationService.getOpenPostReport(postId),
    enabled,
  })
}

export function useReportWorker() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: moderationService.reportWorker,
    onSuccess: (report, variables) => {
      toast.success("Đã gửi báo cáo worker.")
      queryClient.setQueryData(
        queryKeys.moderation.openWorkerReport(variables.worker_id),
        report ?? null
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.moderation.all })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể gửi báo cáo.")),
  })
}

export function useOpenWorkerReport(workerId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.moderation.openWorkerReport(workerId),
    queryFn: () => moderationService.getOpenWorkerReport(workerId),
    enabled,
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

export function useRevokeRestriction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: moderationService.revokeRestriction,
    onSuccess: () => {
      toast.success("Đã gỡ lệnh cấm.")
      queryClient.invalidateQueries({ queryKey: queryKeys.moderation.all })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể gỡ lệnh cấm.")),
  })
}

export function useAdminDeletePost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      postId,
      reportId,
    }: {
      postId: string
      reportId?: string | null
    }) => moderationService.deletePostAsAdmin(postId, reportId ?? null),
    onSuccess: () => {
      toast.success("Đã xóa bài viết.")
      queryClient.invalidateQueries({ queryKey: queryKeys.moderation.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all })
    },
  })
}
