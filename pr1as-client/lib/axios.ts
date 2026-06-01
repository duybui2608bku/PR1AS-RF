import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios"
import { useAuthStore } from "@/lib/store/auth-store"
import { toApiError } from "@/lib/utils/error-handler"
import { getQueryClient } from "@/lib/query-client"

const ensureApiBasePath = (url: string) => {
  const trimmedUrl = url.replace(/\/+$/, "")
  return trimmedUrl.endsWith("/api") ? trimmedUrl : `${trimmedUrl}/api`
}

const configuredBaseURL = process.env.NEXT_PUBLIC_API_URL
const fallbackURL = "http://localhost:3052/api"

// Browser: luôn dùng /api (relative) — Next.js rewrite forward đến backend server-to-server.
// Cookie được set cho frontend domain → không có cross-domain issue, không cần thêm env var.
// Server (SSR): dùng full URL để request trực tiếp (không qua rewrite).
const apiBaseURL =
  typeof window !== "undefined"
    ? "/api"
    : ensureApiBasePath(configuredBaseURL ?? fallbackURL)

const csrfCookieName = "XSRF-TOKEN"
const csrfHeaderName = "X-CSRF-Token"
const unsafeMethods = new Set(["post", "put", "patch", "delete"])

if (!configuredBaseURL) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_URL is required in production builds.")
  }
  console.warn(
    `[axios] NEXT_PUBLIC_API_URL is not set, falling back to ${fallbackURL}`
  )
}

export const api: AxiosInstance = axios.create({
  baseURL: apiBaseURL,
  withCredentials: true,  // Tự động gửi httpOnly cookie với mọi request
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

// Request interceptor — chỉ cần CSRF header, cookie được gửi tự động bởi browser
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  await attachCsrfHeader(config)
  return config
})

// Mechanism for silent refreshing with concurrent request queueing
let isRefreshing = false
let failedQueue: Array<{
  resolve: () => void
  reject: (error: unknown) => void
}> = []

const processQueue = (error: unknown) => {
  failedQueue.forEach((item) => {
    if (error) {
      item.reject(error)
    } else {
      item.resolve()
    }
  })
  failedQueue = []
}

// Response interceptor — bắt 401 và tự động refresh token qua cookie
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const state = useAuthStore.getState()

      // Không có session → nếu đã authenticated thì force logout
      // Nếu chưa authenticated (request từ public page), chỉ reject
      if (typeof window !== "undefined" && state.isAuthenticated && !state.isLoggingOut) {
        // Nếu refresh đang chạy, queue request này
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({
              resolve: () => resolve(api(originalRequest)),
              reject,
            })
          })
        }

        originalRequest._retry = true
        isRefreshing = true

        try {
          const csrfToken = await ensureCsrfToken()
          // refreshToken cookie tự được gửi theo withCredentials vì path khớp
          await axios.post(`${apiBaseURL}/auth/refresh-token`, {}, {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
              "Accept-Language": "vi",
              ...(csrfToken ? { [csrfHeaderName]: csrfToken } : {}),
            }
          })

          // Refresh thành công — backend đã set cookie mới, unblock queue
          processQueue(null)
          return api(originalRequest)
        } catch (refreshError) {
          processQueue(refreshError)

          if (typeof window !== "undefined" && !state.isLoggingOut) {
            state.setLoggingOut(true)
            state.clearAuth()
            getQueryClient().clear()
            window.location.replace("/login")
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

    // Handle 403 USER_BANNED
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
