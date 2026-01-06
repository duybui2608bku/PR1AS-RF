"use client";

import { api, extractData } from "../axios/index";
import type { ApiResponse } from "../axios";
import { ApiEndpoint, buildEndpoint } from "../constants/api-endpoints";
import type { UserProfile, UpdateBasicProfileInput } from "./auth.api";

export interface User {
  id: string;
  email: string;
  avatar?: string | null;
  full_name?: string | null;
  phone?: string | null;
  roles?: string[];
  status?: string;
  last_active_role?: string;
  verify_email?: boolean;
  created_at: string;
  updated_at: string;
}

export interface GetUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  role?: string;
}

export interface GetUsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UpdateUserStatusInput {
  status: string;
}

export const userApi = {
  getUsers: async (query?: GetUsersQuery): Promise<GetUsersResponse> => {
    const response = await api.get<ApiResponse<GetUsersResponse>>(
      ApiEndpoint.USERS,
      { params: query }
    );
    return extractData(response);
  },

  updateUserStatus: async (
    userId: string,
    data: UpdateUserStatusInput
  ): Promise<User> => {
    const response = await api.patch<ApiResponse<{ user: User }>>(
      buildEndpoint(ApiEndpoint.USERS_STATUS, { id: userId }),
      data
    );
    return extractData(response).user;
  },
};

export const userProfileApi = {
  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get<ApiResponse<{ user: UserProfile }>>(
      ApiEndpoint.AUTH_PROFILE
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
};

export type { UpdateBasicProfileInput };
