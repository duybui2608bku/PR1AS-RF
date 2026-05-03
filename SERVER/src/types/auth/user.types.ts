import { Document } from "mongoose";
import { PricingPlanCode } from "../../constants/pricing";

export enum UserRole {
  CLIENT = "client",
  WORKER = "worker",
  ADMIN = "admin",
}

export enum UserStatus {
  ACTIVE = "active",
  BANNED = "banned",
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

export interface WorkerWorkLocation {
  province_code: number;
  ward_code: number;
  label_snapshot?: string;
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
  work_locations?: WorkerWorkLocation[];
}

export interface ClientProfile {
  company_name: string;
  website: string;
  total_spent: number;
}

export interface IUser {
  email: string;
  password_hash: string;
  avatar?: string;
  full_name?: string;
  phone?: string;
  roles: UserRole[];
  last_active_role: UserRole;
  worker_profile: WorkerProfile | null;
  client_profile: ClientProfile | null;
  status: UserStatus;
  verify_email: boolean;
  created_at: Date;
  last_login: Date | null;
  refresh_token_hash?: string | null;
  password_reset_token?: string | null;
  password_reset_expires?: Date | null;
  email_verification_token?: string | null;
  email_verification_expires?: Date | null;
  coords: {
    latitude: number | null;
    longitude: number | null;
  };
  pricing_plan_code: PricingPlanCode;
  pricing_started_at: Date | null;
  pricing_expires_at: Date | null;
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
  last_active_role: UserRole;
  worker_profile: WorkerProfile | null;
  client_profile: ClientProfile | null;
  coords: {
    latitude: number | null;
    longitude: number | null;
  };
  created_at: Date;
  pricing_plan_code: PricingPlanCode;
  pricing_started_at: Date | null;
  pricing_expires_at: Date | null;
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

export interface AuthResponse {
  user: IUserPublic;
  token: string;
  refreshToken: string;
}

export interface RegisterResponse {
  user: IUserPublic;
  requires_email_verification: boolean;
}
