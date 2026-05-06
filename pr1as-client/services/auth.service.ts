import { api } from "@/lib/axios"
import { normalizeEmail } from "@/lib/auth/auth-input.utils"
import type { AuthUser } from "@/lib/store/auth-store"

export type LoginPayload = { email: string; password: string }
export type LoginResult = { user: AuthUser; token: string }
export type SwitchRolePayload = { last_active_role: string }
export type SwitchRoleResult = { user: AuthUser }

export const authService = {
  me: async () => {
    const { data } = await api.get<AuthUser>("/auth/me")
    return data
  },
  login: async (payload: LoginPayload) => {
    const { data } = await api.post<LoginResult>("/auth/login", {
      ...payload,
      email: normalizeEmail(payload.email),
    })
    return data
  },
  logout: async () => {
    await api.post("/auth/logout")
  },
  switchRole: async (payload: SwitchRolePayload) => {
    const { data } = await api.patch<SwitchRoleResult>(
      "/auth/switch-role",
      payload
    )
    return data
  },
}
