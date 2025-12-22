import { UserRole, UserStatus } from "../auth/user.types";

export interface GetUsersQuery {
  page?: number;
  limit?: number;
  skip?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  startDate?: string;
  endDate?: string;
}
