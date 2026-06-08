"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { queryKeys } from "@/lib/query-keys"
import {
  type SiteSettings,
  siteSettingsService,
} from "@/services/site-settings.service"

export function useSiteSettings() {
  return useQuery({
    queryKey: queryKeys.siteSettings.all,
    queryFn: siteSettingsService.get,
    staleTime: Infinity,
  })
}

export function useUpdateSiteSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<SiteSettings>) =>
      Promise.resolve(siteSettingsService.save(patch)),
    onSuccess: () => {
      toast.success("Đã lưu cài đặt.")
      queryClient.invalidateQueries({ queryKey: queryKeys.siteSettings.all })
    },
    onError: () => toast.error("Không thể lưu cài đặt."),
  })
}

export function useResetSiteSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => Promise.resolve(siteSettingsService.reset()),
    onSuccess: () => {
      toast.success("Đã đặt lại về mặc định.")
      queryClient.invalidateQueries({ queryKey: queryKeys.siteSettings.all })
    },
    onError: () => toast.error("Không thể đặt lại cài đặt."),
  })
}

export function useToggleMaintenanceMode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      maintenanceMode,
      maintenanceMessage,
    }: {
      maintenanceMode: boolean
      maintenanceMessage: string
    }) =>
      Promise.resolve(
        siteSettingsService.save({ maintenanceMode, maintenanceMessage })
      ),
    onSuccess: (_, variables) => {
      if (variables.maintenanceMode) {
        toast.warning("Chế độ bảo trì đã được BẬT. Người dùng sẽ bị chặn truy cập.")
      } else {
        toast.success("Chế độ bảo trì đã được TẮT. Website hoạt động bình thường.")
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.siteSettings.all })
    },
    onError: () => toast.error("Không thể cập nhật trạng thái bảo trì."),
  })
}
