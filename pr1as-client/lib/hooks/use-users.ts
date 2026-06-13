"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { queryKeys } from "@/lib/query-keys"
import {
  userService,
  type AdminCreateUserPayload,
  type AdminUpdateUserPayload,
  type GetUsersParams,
  type UserStatus,
} from "@/services/user.service"
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
      toast.success(
        status === "active" ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản."
      )
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Không thể cập nhật trạng thái tài khoản.")
      )
    },
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AdminCreateUserPayload) =>
      userService.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}

export function useGetUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => userService.getUser(id),
    enabled: !!id,
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: AdminUpdateUserPayload
    }) => userService.updateUser(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id) })
    },
  })
}
