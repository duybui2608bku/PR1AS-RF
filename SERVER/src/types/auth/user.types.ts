import { Document } from "mongoose";
import { PricingPlanCode } from "../../constants/pricing";

export enum UserRole {
  CLIENT = "client",
  WORKER = "worker",
  ADMIN = "admin",
}

export enum UserStatus {
  ACTIVE = "active",
  // Email/password signup that hasn't completed email verification yet. Cannot
  // authenticate any request until verified (→ ACTIVE). Google signups skip
  // this state because the provider already vouches for the address.
  PENDING_VERIFY = "pending_verify",
  // Soft-disabled account — admin deactivation or (future) self-deactivation.
  // Unlike BANNED it is not punitive and unlike PENDING_DELETE it has no grace
  // timer: the data is kept intact and an admin can flip it back to ACTIVE. The
  // user cannot act while inactive.
  INACTIVE = "inactive",
  BANNED = "banned",
  // User requested account deletion. Frozen for 30 days; logging in restores
  // the account to ACTIVE. After the grace window a cron transitions to
  // DELETED + scrubs PII.
  PENDING_DELETE = "pending_delete",
  // PII scrubbed. Account is unrecoverable but the row is kept so historical
  // references (bookings, reviews, wallet transactions) still join cleanly.
  DELETED = "deleted",
}

export enum gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

export enum Experience {
  LESS_THAN_1 = "LESS_THAN_1",
  ONE_TO_3 = "ONE_TO_3",
  THREE_TO_5 = "THREE_TO_5",
  FIVE_TO_10 = "FIVE_TO_10",
  MORE_THAN_10 = "MORE_THAN_10",
}

export interface WorkerProfile {
  date_of_birth?: Date;
  gender: gender;
  height_cm?: number;
  weight_kg?: number;
  star_sign?: string;
  lifestyle?: string;
  hobbies: string[];
  quote?: string;
  introduction?: string;
  gallery_urls: string[];
  experience?: Experience;
  title?: string;
  work_locations?: Array<{
    province_code: number;
    ward_code?: number | null;
    label_snapshot?: string;
  }>;
}

export interface ClientProfile {
  company_name: string;
  website: string;
  total_spent: number;
}

export interface IUser {
  email: string;
  password_hash?: string;
  google_id?: string;
  avatar?: string;
  full_name?: string;
  phone?: string;
  roles: UserRole[];
  last_active_role: UserRole;
  worker_profile: WorkerProfile | null;
  client_profile: ClientProfile | null;
  status: UserStatus;
  booking_lock_version?: number;
  deleted_at: Date | null;
  verify_email: boolean;
  created_by_admin?: boolean;
  created_at: Date;
  last_login: Date | null;
  refresh_token_hash?: string | null;
  // Hash of the immediately-previous refresh token, kept briefly after rotation
  // so concurrent refreshes from sibling tabs/devices (which all present the same
  // pre-rotation token) are not misread as token theft. See REFRESH_TOKEN.REUSE_GRACE_MS.
  previous_refresh_token_hash?: string | null;
  refresh_token_rotated_at?: Date | null;
  failed_login_attempts?: number;
  locked_until?: Date | null;
  password_reset_token?: string | null;
  password_reset_expires?: Date | null;
  email_verification_token?: string | null;
  email_verification_expires?: Date | null;
  coords: {
    latitude: number | null;
    longitude: number | null;
  };
  meta_data: {
    reputation_score: number;
    pricing_plan_code: PricingPlanCode;
    pricing_started_at: Date | null;
    pricing_expires_at: Date | null;
    onboarding_done: boolean;
    locale?: string;
  };
}

export interface IUserDocument extends IUser, Document {}

export interface IUserPublic {
  id: string;
  email: string;
  avatar?: string;
  full_name?: string;
  phone?: string;
  roles: UserRole[];
  status: UserStatus;
  verify_email: boolean;
  created_by_admin?: boolean;
  last_active_role: UserRole;
  worker_profile: WorkerProfile | null;
  client_profile: ClientProfile | null;
  coords: {
    latitude: number | null;
    longitude: number | null;
  };
  created_at: Date;
  last_login?: Date | null;
  meta_data: {
    reputation_score: number;
    pricing_plan_code: PricingPlanCode;
    pricing_started_at: Date | null;
    pricing_expires_at: Date | null;
    onboarding_done: boolean;
    locale?: string;
  };
}

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

export interface GoogleLoginInput {
  id_token: string;
}

export interface AuthResponse {
  user: IUserPublic;
  token: string;
  refreshToken: string;
}

export interface RegisterResponse {
  user?: IUserPublic;
  requires_email_verification: boolean;
}
