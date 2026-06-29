"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { queryKeys } from "@/lib/query-keys"
import { type AboutContentPatch, aboutService } from "@/services/about.service"

export function useAboutContent() {
  return useQuery({
    queryKey: queryKeys.about.all,
    queryFn: aboutService.get,
    staleTime: Infinity,
  })
}

export function useUpdateAboutContent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: AboutContentPatch) => aboutService.save(patch),
    onSuccess: (data) => {
      toast.success("Đã lưu nội dung trang giới thiệu.")
      queryClient.setQueryData(queryKeys.about.all, data)
      queryClient.invalidateQueries({ queryKey: queryKeys.about.all })
    },
    onError: () => toast.error("Không thể lưu nội dung."),
  })
}

export function useResetAboutContent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => aboutService.reset(),
    onSuccess: (data) => {
      toast.success("Đã đặt lại về mặc định.")
      queryClient.setQueryData(queryKeys.about.all, data)
      queryClient.invalidateQueries({ queryKey: queryKeys.about.all })
    },
    onError: () => toast.error("Không thể đặt lại nội dung."),
  })
}
