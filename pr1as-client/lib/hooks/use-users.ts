"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { queryKeys } from "@/lib/query-keys"
import { userService, type GetUsersParams, type UserStatus } from "@/services/user.service"
import { getErrorMessage } from "@/lib/utils/error-handler"

export function useGetUsers(params: GetUsersParams = {}) {
  return useQuery({
    queryKey: queryKeys.users.list(params as Record<string, unknown>),
    queryFn: () => userService.getUsers(params),
    placeholderData: (prev) => prev,
  })
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: UserStatus }) =>
      userService.updateUserStatus(userId, { status }),
    onSuccess: (_, { status }) => {
      toast.success(status === "active" ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.")
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không thể cập nhật trạng thái tài khoản."))
    },
  })
}
