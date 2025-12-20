"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios";
import { useAuthStore } from "../stores/auth.store";
import type { ApiResponse } from "../axios";

/**
 * Auth API Types
 */
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
}

/**
 * Hook để đăng nhập
 */
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
        const { user, token } = data.data;
        login(user, token);
        // Invalidate user queries
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      }
    },
  });
}

/**
 * Hook để đăng ký
 */
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
        const { user, token } = data.data;
        login(user, token);
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      }
    },
  });
}

/**
 * Hook để lấy thông tin user hiện tại
 */
export function useMe() {
  const { setLoading } = useAuthStore();

  return useQuery<ApiResponse<{ user: AuthResponse["user"] }>>({
    queryKey: ["auth", "me"],
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
    enabled: !!useAuthStore.getState().token, // Chỉ fetch khi có token
    retry: false,
  });
}

/**
 * Hook để đăng xuất
 */
export function useLogout() {
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation<void, Error>({
    mutationFn: async () => {
      await api.post("/auth/logout");
    },
    onSuccess: () => {
      logout();
      // Clear tất cả queries
      queryClient.clear();
    },
  });
}
