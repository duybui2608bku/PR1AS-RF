"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/axios"
import { queryKeys } from "@/lib/query-keys"
import { useAuthStore, type AuthUser } from "@/lib/store/auth-store"
import { normalizeEmail } from "@/lib/auth/auth-input.utils"

interface ApiResponse<T> {
  success: boolean
  statusCode?: number
  data?: T
  message?: string
  error?: {
    code?: string
    message?: string
  }
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  full_name?: string
  phone?: string
}

interface AuthResponse {
  user: AuthUser
  token: string
}

interface SwitchRoleRequest {
  last_active_role: "client" | "worker"
}

interface SwitchRoleResponse {
  user: AuthUser
}

export interface ResetPasswordRequest {
  token: string
  password: string
}

export interface VerifyEmailRequest {
  token: string
}

export interface ResendVerificationRequest {
  email: string
}

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: LoginRequest) => {
      const response = await api.post<ApiResponse<AuthResponse>>("/auth/login", {
        ...payload,
        email: normalizeEmail(payload.email),
      })
      return response.data
    },
    onSuccess: (data) => {
      if (!data.success || !data.data) {
        return
      }

      setAuth({ user: data.data.user, token: data.data.token })
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: async (payload: RegisterRequest) => {
      const response = await api.post<ApiResponse<{ message: string }>>("/auth/register", {
        ...payload,
        email: normalizeEmail(payload.email),
      })
      return response.data
    },
  })
}

export function useMe() {
  const token = useAuthStore((s) => s.token)

  return useQuery({
    queryKey: queryKeys.auth.me,
    enabled: Boolean(token),
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ user: AuthUser }>>("/auth/me")
      return response.data
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

export function useSwitchRole() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const setAuth = useAuthStore((s) => s.setAuth)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: SwitchRoleRequest) => {
      const response = await api.patch<ApiResponse<SwitchRoleResponse>>("/auth/switch-role", payload)
      return response.data
    },
    onSuccess: (data) => {
      if (!data.success || !data.data?.user || !user || !token) {
        return
      }

      setAuth({ user: data.data.user, token })
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
    },
  })
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: async (payload: VerifyEmailRequest) => {
      const response = await api.post<ApiResponse<{ message: string }>>("/auth/verify-email", payload)
      return response.data
    },
  })
}

export function useResendVerification() {
  return useMutation({
    mutationFn: async (payload: ResendVerificationRequest) => {
      const response = await api.post<ApiResponse<{ message: string }>>("/auth/resend-verification", {
        email: normalizeEmail(payload.email),
      })
      return response.data
    },
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (payload: ResetPasswordRequest) => {
      const response = await api.post<ApiResponse<{ message: string }>>("/auth/reset-password", payload)
      return response.data
    },
  })
}

export interface UpdateBasicProfileRequest {
  full_name?: string | null
  phone?: string | null
  avatar?: string | null
  old_password?: string
  password?: string
}

export function useUpdateBasicProfile() {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const setAuth = useAuthStore((s) => s.setAuth)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateBasicProfileRequest) => {
      const response = await api.patch<ApiResponse<{ user: AuthUser }>>("/auth/update-profile", payload)
      return response.data
    },
    onSuccess: (data) => {
      if (!data.success || !data.data?.user || !token) return

      setAuth({ user: { ...user, ...data.data.user }, token })
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
    },
  })
}
