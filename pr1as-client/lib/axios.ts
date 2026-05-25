import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios"
import { useAuthStore } from "@/lib/store/auth-store"
import { setSessionCookie, clearSessionCookie } from "@/lib/auth/auth-cookie"
import { toApiError } from "@/lib/utils/error-handler"
import { getQueryClient } from "@/lib/query-client"

const ensureApiBasePath = (url: string) => {
  const trimmedUrl = url.replace(/\/+$/, "")
  return trimmedUrl.endsWith("/api") ? trimmedUrl : `${trimmedUrl}/api`
}

const configuredBaseURL = process.env.NEXT_PUBLIC_API_URL
const fallbackURL = "http://localhost:3052/api"
const apiBaseURL = ensureApiBasePath(configuredBaseURL ?? fallbackURL)

if (!configuredBaseURL) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_URL is required in production builds.")
  }
  console.warn(
    `[axios] NEXT_PUBLIC_API_URL is not set, falling back to ${apiBaseURL}`
  )
}

export const api: AxiosInstance = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "Accept-Language": "vi",
  },
  timeout: 15_000,
})

// Request interceptor to dynamically inject the authorization header
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`)
  }
  return config
})

// Mechanism for silent refreshing with concurrent request queueing
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else if (token) {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Response interceptor to intercept 401s and execute silent refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const state = useAuthStore.getState()
      const refreshToken = state.refreshToken

      // If we don't have a refresh token, we cannot refresh. Force logout.
      if (!refreshToken) {
        if (typeof window !== "undefined" && !state.isLoggingOut) {
          state.setLoggingOut(true)
          state.clearAuth()
          getQueryClient().clear()
          void clearSessionCookie()
        }
        const apiError = toApiError(error)
        return Promise.reject(apiError ?? error)
      }

      // If a refresh is already in flight, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.set("Authorization", `Bearer ${token}`)
              resolve(api(originalRequest))
            },
            reject: (err: unknown) => {
              reject(err)
            },
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Call backend API directly to refresh tokens
        const response = await axios.post(`${apiBaseURL}/auth/refresh-token`, {
          refreshToken,
        }, {
          headers: {
            "Content-Type": "application/json",
            "Accept-Language": "vi",
          }
        })

        const { success, data } = response.data
        if (success && data && data.token) {
          const newToken = data.token
          const newRefreshToken = data.refreshToken ?? refreshToken

          // 1. Sync Zustand store with new tokens
          state.setAuth({
            user: data.user || state.user,
            token: newToken,
            refreshToken: newRefreshToken,
          })

          // 2. Set the httpOnly session cookie
          await setSessionCookie(newToken)

          // 3. Resolve all queued requests with the new token
          processQueue(null, newToken)

          // 4. Retry the original request
          originalRequest.headers.set("Authorization", `Bearer ${newToken}`)
          return api(originalRequest)
        } else {
          throw new Error("Làm mới token không thành công.")
        }
      } catch (refreshError) {
        // If refresh fails (expired refresh token), clear auth and force logout
        processQueue(refreshError, null)
        
        if (typeof window !== "undefined" && !state.isLoggingOut) {
          state.setLoggingOut(true)
          state.clearAuth()
          getQueryClient().clear()
          void clearSessionCookie()
        }
        
        const apiError = toApiError(error)
        return Promise.reject(apiError ?? error)
      } finally {
        isRefreshing = false
      }
    }

    const apiError = toApiError(error)
    return Promise.reject(apiError ?? error)
  }
)
