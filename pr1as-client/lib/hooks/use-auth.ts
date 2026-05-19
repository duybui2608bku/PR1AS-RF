"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/axios"
import { setSessionCookie, clearSessionCookie } from "@/lib/auth/auth-cookie"
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

export interface ForgotPasswordRequest {
  email: string
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
    onSuccess: async (data) => {
      if (!data.success || !data.data) {
        return
      }

      const { user, token } = data.data
      setAuth({ user, token })
      // Set the httpOnly session cookie from the server side so it is
      // inaccessible to JavaScript (XSS-safe). Fire before invalidating
      // queries so the cookie is present for any subsequent SSR checks.
      await setSessionCookie(token)
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
    },
  })
}

export function useGoogleLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (accessToken: string) => {
      const response = await api.post<ApiResponse<AuthResponse>>("/auth/google", { access_token: accessToken })
      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success || !data.data) return
      const { user, token } = data.data
      setAuth({ user, token })
      await setSessionCookie(token)
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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: queryKeys.auth.me,
    // Enabled whenever the store believes the user is authenticated —
    // on a fresh page load the httpOnly cookie handles the actual auth.
    enabled: isAuthenticated,
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
      // Clear the httpOnly cookie via the Route Handler. Must finish before
      // clearAuth() so the middleware no longer sees a session cookie.
      await clearSessionCookie()
    },
    onSettled: () => {
      clearAuth()
      queryClient.clear()
    },
  })
}

export function useSwitchRole() {
  const setUser = useAuthStore((s) => s.setUser)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: SwitchRoleRequest) => {
      const response = await api.patch<ApiResponse<SwitchRoleResponse>>("/auth/switch-role", payload)
      return response.data
    },
    onSuccess: (data) => {
      if (!data.success || !data.data?.user) {
        return
      }

      setUser(data.data.user)
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

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (payload: ForgotPasswordRequest) => {
      const response = await api.post<ApiResponse<{ message: string }>>("/auth/forgot-password", {
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
  const setUser = useAuthStore((s) => s.setUser)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateBasicProfileRequest) => {
      const response = await api.patch<ApiResponse<{ user: AuthUser }>>("/auth/update-profile", payload)
      return response.data
    },
    onSuccess: (data) => {
      if (!data.success || !data.data?.user) return

      setUser({ ...user, ...data.data.user } as AuthUser)
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
    },
  })
}
