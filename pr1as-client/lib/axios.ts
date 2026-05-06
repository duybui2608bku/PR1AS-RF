import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios"
import { useAuthStore } from "@/lib/store/auth-store"
import { toApiError } from "@/lib/utils/error-handler"
import { getQueryClient } from "@/lib/query-client"

const baseURL = process.env.NEXT_PUBLIC_API_URL

if (!baseURL) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_URL is required in production builds.")
  }
  console.warn(
    "[axios] NEXT_PUBLIC_API_URL is not set, falling back to http://localhost:3001/api"
  )
}

export const api: AxiosInstance = axios.create({
  baseURL: baseURL ?? "http://localhost:3001/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15_000,
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`)
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      useAuthStore.getState().clearAuth()
      getQueryClient().clear()
    }

    const apiError = toApiError(error)
    return Promise.reject(apiError ?? error)
  }
)
