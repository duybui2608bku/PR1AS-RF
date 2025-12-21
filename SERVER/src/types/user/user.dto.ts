import { UserRole, UserStatus } from "../auth/user.types";

export interface GetUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  startDate?: string;
  endDate?: string;
}

export interface UserListResponse {
  users: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
