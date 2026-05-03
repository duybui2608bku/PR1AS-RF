import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios"

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api"

export const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15_000,
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("auth_token")
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`)
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      window.localStorage.removeItem("auth_token")
    }
    return Promise.reject(error)
  },
)

export type ApiError = AxiosError<{ message?: string; errors?: Record<string, string[]> }>
