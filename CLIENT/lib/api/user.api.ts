"use client";

import { api, extractData } from "../axios/index";
import type { ApiResponse } from "../axios";

/**
 * Update Basic Profile Input
 */
export interface UpdateBasicProfileInput {
  password?: string;
  old_password?: string;
  avatar?: string | null;
  full_name?: string | null;
  phone?: string | null;
}

/**
 * User Profile Response
 */
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
}

/**
 * User Profile API
 */
export const userProfileApi = {
  /**
   * Lấy thông tin user profile hiện tại
   */
  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get<ApiResponse<{ user: UserProfile }>>(
      "/auth/me"
    );
    const data = extractData(response);
    return data.user;
  },

  /**
   * Cập nhật basic profile (password, avatar, full_name, phone)
   */
  updateBasicProfile: async (
    data: UpdateBasicProfileInput
  ): Promise<UserProfile> => {
    const response = await api.patch<ApiResponse<{ user: UserProfile }>>(
      "/auth/update-profile",
      data
    );
    return extractData(response).user;
  },
};

