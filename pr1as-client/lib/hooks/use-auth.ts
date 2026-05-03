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
  const { setAuth } = useAuthStore()
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
  const { token } = useAuthStore()

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
  const { clearAuth } = useAuthStore()
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
