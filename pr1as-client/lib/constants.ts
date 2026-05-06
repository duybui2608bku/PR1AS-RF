export const APP_ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  dashboard: "/dashboard",
} as const

export const STORAGE_KEYS = {
  authStorage: "auth-storage",
  theme: "theme",
} as const

export const QUERY_DEFAULTS = {
  staleTime: 60 * 1000,
  gcTime: 5 * 60 * 1000,
} as const
