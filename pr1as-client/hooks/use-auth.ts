"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api, type ApiError } from "@/lib/axios"
import { queryKeys } from "@/lib/query-keys"
import { useAuthStore, type AuthUser } from "@/lib/store/auth-store"

type LoginInput = {
  email: string
  password: string
}

type LoginResponse = {
  user: AuthUser
  token: string
}

export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => {
      const { data } = await api.get<AuthUser>("/auth/me")
      return data
    },
    enabled: isAuthenticated,
  })
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const queryClient = useQueryClient()

  return useMutation<LoginResponse, ApiError, LoginInput>({
    mutationFn: async (input) => {
      const { data } = await api.post<LoginResponse>("/auth/login", input)
      return data
    },
    onSuccess: (data) => {
      setAuth(data)
      queryClient.setQueryData(queryKeys.auth.me, data.user)
    },
  })
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await api.post("/auth/logout")
    },
    onSettled: () => {
      clearAuth()
      queryClient.clear()
    },
  })
}
