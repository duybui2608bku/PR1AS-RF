"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { queryKeys } from "@/lib/query-keys"
import { getErrorMessage } from "@/lib/utils/error-handler"
import {
  emailCampaignService,
  type CreateCampaignInput,
  type UpdateCampaignInput,
  type EmailCampaignStatus,
  type EmailCampaignAudience,
  type EmailSendLogStatus,
} from "@/services/email-campaign.service"

export function useEmailCampaigns(params?: {
  page?: number
  limit?: number
  status?: EmailCampaignStatus
  audience?: EmailCampaignAudience
  from?: string
  to?: string
}) {
  return useQuery({
    queryKey: queryKeys.emailCampaigns.list(params),
    queryFn: () => emailCampaignService.list(params),
  })
}

export function useEmailCampaign(id: string) {
  return useQuery({
    queryKey: queryKeys.emailCampaigns.detail(id),
    queryFn: () => emailCampaignService.get(id),
    enabled: Boolean(id),
  })
}

export function useEmailCampaignLogs(
  id: string,
  params?: { page?: number; limit?: number; status?: EmailSendLogStatus }
) {
  return useQuery({
    queryKey: queryKeys.emailCampaigns.logs(id, params),
    queryFn: () => emailCampaignService.listLogs(id, params),
    enabled: Boolean(id),
  })
}

export function useCreateEmailCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCampaignInput) =>
      emailCampaignService.create(input),
    onSuccess: () => {
      toast.success("Đã tạo chiến dịch email.")
      queryClient.invalidateQueries({ queryKey: queryKeys.emailCampaigns.all })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể tạo chiến dịch email.")),
  })
}

export function useUpdateEmailCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCampaignInput }) =>
      emailCampaignService.update(id, input),
    onSuccess: () => {
      toast.success("Đã cập nhật chiến dịch email.")
      queryClient.invalidateQueries({ queryKey: queryKeys.emailCampaigns.all })
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(error, "Không thể cập nhật chiến dịch email.")
      ),
  })
}

export function useDeleteEmailCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => emailCampaignService.delete(id),
    onSuccess: () => {
      toast.success("Đã xóa chiến dịch email.")
      queryClient.invalidateQueries({ queryKey: queryKeys.emailCampaigns.all })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể xóa chiến dịch email.")),
  })
}

export function useSendEmailCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => emailCampaignService.send(id),
    onSuccess: () => {
      toast.success(
        "Đã bắt đầu gửi chiến dịch email. Hệ thống đang gửi ở nền, bạn có thể theo dõi tiến độ trong mục Log."
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.emailCampaigns.all })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể gửi chiến dịch email.")),
  })
}

export function useCancelEmailCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => emailCampaignService.cancel(id),
    onSuccess: () => {
      toast.success("Đã hủy lịch gửi chiến dịch email.")
      queryClient.invalidateQueries({ queryKey: queryKeys.emailCampaigns.all })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể hủy chiến dịch email.")),
  })
}
