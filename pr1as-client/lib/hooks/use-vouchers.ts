"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { queryKeys } from "@/lib/query-keys"
import { useAuthStore } from "@/lib/store/auth-store"
import { getErrorMessage } from "@/lib/utils/error-handler"
import { PRICING_KEYS } from "@/lib/hooks/use-pricing"
import {
  voucherService,
  type CreateVouchersInput,
  type ListVouchersParams,
  type UpdateVoucherInput,
} from "@/services/voucher.service"

export function useAdminVouchers(params?: ListVouchersParams) {
  return useQuery({
    queryKey: queryKeys.vouchers.adminList(params),
    queryFn: () => voucherService.listAdmin(params),
    staleTime: 30_000,
  })
}

export function useCreateVouchers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateVouchersInput) => voucherService.create(input),
    onSuccess: (vouchers) => {
      toast.success(
        vouchers.length > 1
          ? `Đã tạo ${vouchers.length} mã voucher.`
          : "Đã tạo mã voucher."
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.vouchers.all })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể tạo voucher.")),
  })
}

export function useUpdateVoucher() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateVoucherInput }) =>
      voucherService.update(id, input),
    onSuccess: () => {
      toast.success("Đã cập nhật voucher.")
      queryClient.invalidateQueries({ queryKey: queryKeys.vouchers.all })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể cập nhật voucher.")),
  })
}

export function useDeleteVoucher() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => voucherService.delete(id),
    onSuccess: () => {
      toast.success("Đã xóa voucher.")
      queryClient.invalidateQueries({ queryKey: queryKeys.vouchers.all })
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Không thể xóa voucher.")),
  })
}

export function useRedeemVoucher() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)

  return useMutation({
    mutationFn: (code: string) => voucherService.redeem(code),
    onSuccess: (data) => {
      if (data) {
        const currentUser = useAuthStore.getState().user
        if (currentUser) {
          setUser({
            ...currentUser,
            meta_data: {
              ...currentUser.meta_data,
              pricing_plan_code: data.plan_code,
              pricing_started_at: data.started_at,
              pricing_expires_at: data.expires_at,
            },
          })
        }
        queryClient.setQueryData(PRICING_KEYS.me(), data)
      }
      queryClient.invalidateQueries({ queryKey: PRICING_KEYS.me() })
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
    },
  })
}
