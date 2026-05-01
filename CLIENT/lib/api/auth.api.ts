"use client";

import { api, extractData } from "../axios/index";
import type { ApiResponse } from "../axios";
import { ApiEndpoint } from "../constants/api-endpoints";
import { normalizeEmail } from "../utils/auth-input.utils";

export interface RegisterInput {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: UserProfile;
}

export interface RegisterResponse {
  user: UserProfile;
  requires_email_verification: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  avatar?: string | null;
  full_name?: string | null;
  phone?: string | null;
  roles?: string[];
  status?: string;
  last_active_role?: string;
  verify_email?: boolean;
  worker_profile?: unknown;
  pricing_plan_code?: "standard" | "gold" | "diamond";
  pricing_started_at?: string | null;
  pricing_expires_at?: string | null;
}

export interface SwitchRoleInput {
  role: string;
}

export interface UpdateProfileInput {
  worker_profile?: unknown;
}

export interface UpdateBasicProfileInput {
  password?: string;
  old_password?: string;
  avatar?: string | null;
  full_name?: string | null;
  phone?: string | null;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface CsrfTokenResponse {
  csrfToken: string;
}

export const authApi = {
  getCsrfToken: async (): Promise<CsrfTokenResponse> => {
    const response = await api.get<ApiResponse<CsrfTokenResponse>>(
      ApiEndpoint.AUTH_CSRF_TOKEN
    );
    return extractData(response);
  },

  register: async (data: RegisterInput): Promise<RegisterResponse> => {
    const payload: RegisterInput = {
      ...data,
      email: normalizeEmail(data.email),
    };
    const response = await api.post<ApiResponse<RegisterResponse>>(
      ApiEndpoint.AUTH_REGISTER,
      payload
    );
    return extractData(response);
  },

  login: async (data: LoginInput): Promise<AuthResponse> => {
    const payload: LoginInput = {
      ...data,
      email: normalizeEmail(data.email),
    };
    const response = await api.post<ApiResponse<AuthResponse>>(
      ApiEndpoint.AUTH_LOGIN,
      payload
    );
    return extractData(response);
  },

  refreshToken: async (data: RefreshTokenInput): Promise<AuthResponse> => {
    const response = await api.post<ApiResponse<AuthResponse>>(
      ApiEndpoint.AUTH_REFRESH_TOKEN,
      data
    );
    return extractData(response);
  },

  getMe: async (): Promise<UserProfile> => {
    const response = await api.get<ApiResponse<{ user: UserProfile }>>(
      ApiEndpoint.AUTH_ME
    );
    const data = extractData(response);
    return data.user;
  },

  logout: async (): Promise<void> => {
    await api.post<ApiResponse<void>>(ApiEndpoint.AUTH_LOGOUT);
  },

  switchRole: async (data: SwitchRoleInput): Promise<UserProfile> => {
    const response = await api.patch<ApiResponse<{ user: UserProfile }>>(
      ApiEndpoint.AUTH_SWITCH_ROLE,
      data
    );
    return extractData(response).user;
  },

  updateProfile: async (data: UpdateProfileInput): Promise<UserProfile> => {
    const response = await api.patch<ApiResponse<{ user: UserProfile }>>(
      ApiEndpoint.AUTH_PROFILE,
      data
    );
    return extractData(response).user;
  },

  updateBasicProfile: async (
    data: UpdateBasicProfileInput
  ): Promise<UserProfile> => {
    const response = await api.patch<ApiResponse<{ user: UserProfile }>>(
      ApiEndpoint.AUTH_UPDATE_PROFILE,
      data
    );
    return extractData(response).user;
  },

  forgotPassword: async (data: ForgotPasswordInput): Promise<void> => {
    const payload: ForgotPasswordInput = {
      ...data,
      email: normalizeEmail(data.email),
    };
    await api.post<ApiResponse<void>>(ApiEndpoint.AUTH_FORGOT_PASSWORD, payload);
  },

  resetPassword: async (data: ResetPasswordInput): Promise<void> => {
    await api.post<ApiResponse<void>>(ApiEndpoint.AUTH_RESET_PASSWORD, data);
  },

  verifyEmail: async (data: VerifyEmailInput): Promise<void> => {
    await api.post<ApiResponse<void>>(ApiEndpoint.AUTH_VERIFY_EMAIL, data);
  },

  resendVerification: async (data: { email: string }): Promise<void> => {
    await api.post<ApiResponse<void>>(ApiEndpoint.AUTH_RESEND_VERIFICATION, {
      email: normalizeEmail(data.email),
    });
  },
};

