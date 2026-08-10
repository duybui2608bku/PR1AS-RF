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
  created_by_admin?: "true" | "false";
}

/**
 * What another user is allowed to see about a client. Whitelist — never add
 * email/phone here. Also returned by GET /bookings/:id/client-profile.
 */
export interface ClientPublicProfile {
  id: string;
  full_name: string | null;
  avatar: string | null;
  member_since: string;
  is_verified: boolean;
  reputation_score: number;
  total_count: number;
  completed_count: number;
  client_cancelled_count: number;
}
