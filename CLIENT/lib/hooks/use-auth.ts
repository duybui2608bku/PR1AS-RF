"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios";
import { useAuthStore } from "../stores/auth.store";
import type { ApiResponse } from "../axios";

const AUTH_QUERY_KEY = ["auth", "me"];
const STALE_TIME_MS = 1000 * 60 * 5;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
    role?: string;
  };
  token: string;
  refreshToken: string;
}

export function useLogin() {
  const { login } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<AuthResponse>, Error, LoginRequest>({
    mutationFn: async (credentials) => {
      const response = await api.post<ApiResponse<AuthResponse>>(
        "/auth/login",
        credentials
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        const { user, token, refreshToken } = data.data;
        login(user, token, refreshToken);
        queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      }
    },
  });
}

export function useRegister() {
  const { login } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<AuthResponse>, Error, RegisterRequest>({
    mutationFn: async (data) => {
      const response = await api.post<ApiResponse<AuthResponse>>(
        "/auth/register",
        data
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        const { user, token, refreshToken } = data.data;
        login(user, token, refreshToken);
        queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      }
    },
  });
}

export function useMe() {
  const { setLoading, token } = useAuthStore();

  return useQuery<ApiResponse<{ user: AuthResponse["user"] }>>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      setLoading(true);
      try {
        const response = await api.get<
          ApiResponse<{ user: AuthResponse["user"] }>
        >("/auth/me");
        return response.data;
      } finally {
        setLoading(false);
      }
    },
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
    staleTime: STALE_TIME_MS,
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation<void, Error>({
    mutationFn: async () => {
      await api.post("/auth/logout");
    },
    onSuccess: () => {
      logout();
      queryClient.clear();
    },
  });
}

export function useRefreshToken() {
  const { setToken, setRefreshToken, refreshToken } = useAuthStore();

  return useMutation<ApiResponse<AuthResponse>, Error>({
    mutationFn: async () => {
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }
      const response = await api.post<ApiResponse<AuthResponse>>(
        "/auth/refresh-token",
        { refreshToken }
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        const { token, refreshToken: newRefreshToken } = data.data;
        setToken(token);
        setRefreshToken(newRefreshToken);
      }
    },
    onError: () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:logout"));
        window.location.href = "/login";
      }
    },
  });
}

export function useSwitchRole() {
  const { setUser, user } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation<
    ApiResponse<{ user: AuthResponse["user"] & { last_active_role?: string } }>,
    Error,
    "client" | "worker"
  >({
    mutationFn: async (role) => {
      const response = await api.patch<
        ApiResponse<{ user: AuthResponse["user"] & { last_active_role?: string } }>
      >("/auth/switch-role", {
        last_active_role: role,
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success && data.data?.user) {
        const updatedUser = {
          ...user!,
          ...data.data.user,
          last_active_role: data.data.user.last_active_role,
        };
        setUser(updatedUser);
        queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      }
    },
  });
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export function useForgotPassword() {
  return useMutation<ApiResponse<{ message: string }>, Error, ForgotPasswordRequest>({
    mutationFn: async (data) => {
      const response = await api.post<ApiResponse<{ message: string }>>(
        "/auth/forgot-password",
        data
      );
      return response.data;
    },
  });
}

export function useResetPassword() {
  return useMutation<ApiResponse<{ message: string }>, Error, ResetPasswordRequest>({
    mutationFn: async (data) => {
      const response = await api.post<ApiResponse<{ message: string }>>(
        "/auth/reset-password",
        data
      );
      return response.data;
    },
  });
}