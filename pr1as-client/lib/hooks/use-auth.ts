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
  refreshToken?: string
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
    onSuccess: (data) => {
      if (!data.success || !data.data) return
      const { user } = data.data
      // Backend đã set httpOnly cookie trực tiếp — chỉ cần lưu user profile vào Zustand
      setAuth({ user })
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
    onSuccess: (data) => {
      if (!data.success || !data.data) return
      const { user } = data.data
      setAuth({ user })
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
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
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
      // Backend xóa cả token và refreshToken cookie trong response
      await api.post("/auth/logout").catch(() => {})
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

export interface DeleteAccountBlocker {
  code: "WALLET_BALANCE" | "ACTIVE_BOOKINGS" | "OPEN_DISPUTES"
  detail: number
}

export interface DeleteAccountResult {
  status: string
  deleted_at: string
  restore_until: string
}

export interface DeletionStatusResult {
  has_password: boolean
  has_google: boolean
  blockers: DeleteAccountBlocker[]
}

/**
 * Pre-check for the delete-account section. Refreshes whenever the panel is
 * opened so the user sees up-to-date wallet/booking state. Stays out of the
 * cache once they navigate away — there is no reason to show stale blockers.
 */
export function useDeletionStatus(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.auth.deletionStatus,
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await api.get<ApiResponse<DeletionStatusResult>>(
        "/auth/me/deletion-status"
      )
      if (!response.data.success || !response.data.data) {
        throw new Error(
          response.data.error?.message ?? "Không thể tải trạng thái xoá."
        )
      }
      return response.data.data
    },
  })
}

/**
 * Self-service account deletion. On success the user enters a 30-day grace
 * window (PENDING_DELETE) — logging back in cancels it; otherwise a cron
 * scrubs PII after the window. The mutation clears local auth state and the
 * caller is expected to redirect to /login.
 */
export function useDeleteAccount() {
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { password: string }) => {
      const response = await api.delete<ApiResponse<DeleteAccountResult>>(
        "/auth/me",
        { data: payload }
      )
      return response.data
    },
    onSettled: (_data, error) => {
      if (error) return
      clearAuth()
      queryClient.clear()
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
      if (payload.password && !payload.old_password) {
        throw new Error("Mật khẩu cũ là bắt buộc khi thay đổi mật khẩu.")
      }
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
