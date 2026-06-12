"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/axios"
import { setSessionCookie, clearSessionCookie } from "@/lib/auth/auth-cookie"
import { queryKeys } from "@/lib/query-keys"
import { useAuthStore, type AuthUser } from "@/lib/store/auth-store"
import { normalizeEmail } from "@/lib/auth/auth-input.utils"
import { ApiError } from "@/lib/utils/error-handler"

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
      // Set httpOnly cookie TRƯỚC khi báo thành công — middleware dựa hoàn toàn
      // vào cookie này. Nếu set fail (đã retry bên trong) thì coi như login
      // thất bại, tránh trạng thái "Zustand authenticated nhưng không có cookie"
      // khiến user bị đá về /login khi vào protected routes.
      if (response.data.success && response.data.data) {
        const cookieOk = await setSessionCookie(response.data.data.token)
        if (!cookieOk) {
          throw new Error("SESSION_SYNC_FAILED")
        }
      }
      return response.data
    },
    onSuccess: (data) => {
      if (!data.success || !data.data) {
        return
      }

      const { user, token, refreshToken } = data.data
      setAuth({ user, token, refreshToken })
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
    },
  })
}

export function useGoogleLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (idToken: string) => {
      const response = await api.post<ApiResponse<AuthResponse>>("/auth/google", { id_token: idToken })
      // Cookie trước, authenticated sau — xem giải thích ở useLogin.
      if (response.data.success && response.data.data) {
        const cookieOk = await setSessionCookie(response.data.data.token)
        if (!cookieOk) {
          throw new Error("SESSION_SYNC_FAILED")
        }
      }
      return response.data
    },
    onSuccess: (data) => {
      if (!data.success || !data.data) return
      const { user, token, refreshToken } = data.data
      setAuth({ user, token, refreshToken })
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
    // Chỉ retry lỗi network (không có statusCode) — chịu được blip mạng mobile.
    // Lỗi 4xx/5xx là kết quả xác định, retry chỉ thêm độ trễ; 401 đã được
    // axios interceptor xử lý (refresh hoặc logout).
    retry: (failureCount, error) => {
      if (failureCount >= 2) return false
      return error instanceof ApiError ? error.statusCode === undefined : true
    },
    retryDelay: (attempt) => 500 * (attempt + 1),
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
      try {
        await api.post("/auth/logout")
      } finally {
        // Always clear the httpOnly cookie regardless of whether the API call
        // succeeded — prevents a stale cookie from blocking navigation to /login.
        await clearSessionCookie()
      }
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
    onSettled: async (_data, error) => {
      if (error) return
      await clearSessionCookie()
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

export function useCompleteOnboarding() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  return useMutation({
    mutationFn: async () => {
      const response = await api.patch<ApiResponse<{ user: AuthUser }>>("/auth/onboarding")
      return response.data
    },
    onSuccess: (data) => {
      if (!data.success || !data.data?.user) return
      setUser({ ...user, ...data.data.user } as AuthUser)
    },
  })
}
