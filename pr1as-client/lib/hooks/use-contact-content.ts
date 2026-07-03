"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { queryKeys } from "@/lib/query-keys"
import {
  contactService,
  type ContactContentPatch,
} from "@/services/contact.service"

export function useContactContent() {
  return useQuery({
    queryKey: queryKeys.contact.all,
    queryFn: contactService.get,
    staleTime: Infinity,
  })
}

export function useUpdateContactContent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: ContactContentPatch) => contactService.save(patch),
    onSuccess: (data) => {
      toast.success("Đã lưu nội dung trang liên hệ.")
      queryClient.setQueryData(queryKeys.contact.all, data)
      queryClient.invalidateQueries({ queryKey: queryKeys.contact.all })
    },
    onError: () => toast.error("Không thể lưu nội dung."),
  })
}

export function useResetContactContent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => contactService.reset(),
    onSuccess: (data) => {
      toast.success("Đã đặt lại về mặc định.")
      queryClient.setQueryData(queryKeys.contact.all, data)
      queryClient.invalidateQueries({ queryKey: queryKeys.contact.all })
    },
    onError: () => toast.error("Không thể đặt lại nội dung."),
  })
}
