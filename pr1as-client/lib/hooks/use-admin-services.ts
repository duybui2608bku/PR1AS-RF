"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { queryKeys } from "@/lib/query-keys"
import { getErrorMessage } from "@/lib/utils/error-handler"
import {
  adminServiceApi,
  type CreateServicePayload,
  type UpdateServicePayload,
} from "@/services/admin-service.service"

export const useAdminServices = (params?: {
  category?: string
  is_active?: boolean
}) => {
  return useQuery({
    queryKey: queryKeys.services.adminList(params),
    queryFn: () => adminServiceApi.list(params),
  })
}

export const useCreateService = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateServicePayload) =>
      adminServiceApi.create(payload),
    onSuccess: () => {
      toast.success("Đã tạo dịch vụ.")
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể tạo dịch vụ.")),
  })
}

export const useUpdateService = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: UpdateServicePayload
    }) => adminServiceApi.update(id, payload),
    onSuccess: () => {
      toast.success("Đã cập nhật dịch vụ.")
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể cập nhật dịch vụ.")),
  })
}

export const useDeprecateService = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminServiceApi.deprecate(id),
    onSuccess: () => {
      toast.success("Đã ngừng dịch vụ.")
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể ngừng dịch vụ.")),
  })
}

export const useReactivateService = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminServiceApi.reactivate(id),
    onSuccess: () => {
      toast.success("Đã bật lại dịch vụ.")
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể bật lại dịch vụ.")),
  })
}

export const useDeleteService = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminServiceApi.remove(id),
    onSuccess: () => {
      toast.success("Đã xóa dịch vụ.")
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all })
    },
    onError: (error) =>
      toast.error(
        getErrorMessage(
          error,
          "Không thể xóa dịch vụ. Nếu đang được sử dụng, hãy Ngừng thay vì Xóa."
        )
      ),
  })
}
