import { api } from "@/lib/axios"
import type { AuthUser } from "@/lib/store/auth-store"

export type LoginPayload = { email: string; password: string }
export type LoginResult = { user: AuthUser; token: string }

export const authService = {
  me: async () => {
    const { data } = await api.get<AuthUser>("/auth/me")
    return data
  },
  login: async (payload: LoginPayload) => {
    const { data } = await api.post<LoginResult>("/auth/login", payload)
    return data
  },
  logout: async () => {
    await api.post("/auth/logout")
  },
}
