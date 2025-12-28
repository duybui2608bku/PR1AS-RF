"use client";

import { api, extractData } from "../axios/index";
import type { ApiResponse } from "../axios";

export interface UpdateBasicProfileInput {
  password?: string;
  old_password?: string;
  avatar?: string | null;
  full_name?: string | null;
  phone?: string | null;
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
}

export const userProfileApi = {
  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get<ApiResponse<{ user: UserProfile }>>(
      "/auth/me"
    );
    const data = extractData(response);
    return data.user;
  },

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

