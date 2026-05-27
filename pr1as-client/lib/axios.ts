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
const csrfCookieName = "XSRF-TOKEN"
const csrfHeaderName = "X-CSRF-Token"
const unsafeMethods = new Set(["post", "put", "patch", "delete"])

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

const readCookie = (name: string) => {
  if (typeof document === "undefined") return null
  const prefix = `${encodeURIComponent(name)}=`
  return (
    document.cookie
      .split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith(prefix))
      ?.slice(prefix.length) ?? null
  )
}

let csrfFetchPromise: Promise<string | null> | null = null

const ensureCsrfToken = async () => {
  if (typeof window === "undefined") return null

  const existing = readCookie(csrfCookieName)
  if (existing) return decodeURIComponent(existing)

  if (!csrfFetchPromise) {
    csrfFetchPromise = axios
      .get(`${apiBaseURL}/csrf-token`, {
        withCredentials: true,
        headers: { "Accept-Language": "vi" },
      })
      .then((response) => {
        const bodyToken = response.data?.data?.csrfToken
        if (typeof bodyToken === "string") return bodyToken
        const headerToken = response.headers["x-csrf-token"]
        if (typeof headerToken === "string") return headerToken
        const cookieToken = readCookie(csrfCookieName)
        return cookieToken ? decodeURIComponent(cookieToken) : null
      })
      .finally(() => {
        csrfFetchPromise = null
      })
  }

  return csrfFetchPromise
}

const attachCsrfHeader = async (config: InternalAxiosRequestConfig) => {
  const method = (config.method ?? "get").toLowerCase()
  if (typeof window === "undefined" || !unsafeMethods.has(method)) {
    return
  }

  const token = await ensureCsrfToken()
  if (token) {
    config.headers.set(csrfHeaderName, token)
  }
}

// Request interceptor to dynamically inject the authorization header
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`)
  }
  await attachCsrfHeader(config)
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

      // If we don't have a refresh token, we cannot refresh.
      // Only force-logout if the user was previously authenticated — a plain 401
      // from a public endpoint (e.g. /auth/login with wrong credentials) should
      // be passed through so the calling component can show an error message.
      if (!refreshToken) {
        if (typeof window !== "undefined" && state.isAuthenticated && !state.isLoggingOut) {
          state.setLoggingOut(true)
          state.clearAuth()
          getQueryClient().clear()
          await clearSessionCookie()
          window.location.replace("/login")
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
        const csrfToken = await ensureCsrfToken()
        // Call backend API directly to refresh tokens
        const response = await axios.post(`${apiBaseURL}/auth/refresh-token`, {
          refreshToken,
        }, {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
            "Accept-Language": "vi",
            ...(csrfToken ? { [csrfHeaderName]: csrfToken } : {}),
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
          await clearSessionCookie()
          window.location.replace("/login")
        }

        const apiError = toApiError(error)
        return Promise.reject(apiError ?? error)
      } finally {
        isRefreshing = false
      }
    }

    // Handle 403 USER_BANNED — trigger the banned modal via custom window event
    if (error.response?.status === 403) {
      const data = error.response.data as Record<string, unknown> | undefined
      const errorCode = data?.error_code ?? data?.message
      if (typeof window !== "undefined" && errorCode === "USER_BANNED") {
        window.dispatchEvent(new CustomEvent("user:banned"))
        return Promise.reject(toApiError(error) ?? error)
      }
    }

    const apiError = toApiError(error)
    return Promise.reject(apiError ?? error)
  }
)
