"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { queryKeys } from "@/lib/query-keys"
import { getErrorMessage } from "@/lib/utils/error-handler"
import {
  announcementService,
  type CreateAnnouncementInput,
  type UpdateAnnouncementInput,
} from "@/services/announcement.service"

export function useAnnouncementByPlacement(placement: string) {
  return useQuery({
    queryKey: queryKeys.announcements.byPlacement(placement),
    queryFn: () => announcementService.getByPlacement(placement),
    enabled: Boolean(placement),
    staleTime: 5 * 60 * 1000,
  })
}

export function useAdminAnnouncements(params?: {
  page?: number
  limit?: number
  placement?: string
  is_active?: boolean
}) {
  return useQuery({
    queryKey: queryKeys.announcements.admin.list(params),
    queryFn: () => announcementService.adminList(params),
  })
}

export function useAdminAnnouncement(id: string) {
  return useQuery({
    queryKey: queryKeys.announcements.admin.detail(id),
    queryFn: () => announcementService.adminGet(id),
    enabled: Boolean(id),
  })
}

export function useCreateAnnouncement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAnnouncementInput) =>
      announcementService.adminCreate(input),
    onSuccess: () => {
      toast.success("Đã tạo thông báo thành công.")
      queryClient.invalidateQueries({
        queryKey: queryKeys.announcements.admin.all,
      })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể tạo thông báo.")),
  })
}

export function useUpdateAnnouncement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAnnouncementInput }) =>
      announcementService.adminUpdate(id, input),
    onSuccess: (_, { id }) => {
      toast.success("Đã cập nhật thông báo.")
      queryClient.invalidateQueries({
        queryKey: queryKeys.announcements.admin.all,
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.announcements.admin.detail(id),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.announcements.all,
      })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể cập nhật thông báo.")),
  })
}

export function useDeleteAnnouncement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => announcementService.adminDelete(id),
    onSuccess: () => {
      toast.success("Đã xóa thông báo.")
      queryClient.invalidateQueries({
        queryKey: queryKeys.announcements.all,
      })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể xóa thông báo.")),
  })
}
