"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { queryKeys } from "@/lib/query-keys"
import {
  legalService,
  type LegalContentPatch,
  type LegalPageKey,
} from "@/services/legal.service"

export function useLegalContent(page: LegalPageKey) {
  return useQuery({
    queryKey: queryKeys.legal.page(page),
    queryFn: () => legalService.get(page),
    staleTime: Infinity,
  })
}

export function useUpdateLegalContent(page: LegalPageKey) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: LegalContentPatch) => legalService.save(page, patch),
    onSuccess: (data) => {
      toast.success("Đã lưu nội dung trang.")
      queryClient.setQueryData(queryKeys.legal.page(page), data)
      queryClient.invalidateQueries({ queryKey: queryKeys.legal.page(page) })
    },
    onError: () => toast.error("Không thể lưu nội dung."),
  })
}

export function useResetLegalContent(page: LegalPageKey) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => legalService.reset(page),
    onSuccess: (data) => {
      toast.success("Đã đặt lại về mặc định.")
      queryClient.setQueryData(queryKeys.legal.page(page), data)
      queryClient.invalidateQueries({ queryKey: queryKeys.legal.page(page) })
    },
    onError: () => toast.error("Không thể đặt lại nội dung."),
  })
}
