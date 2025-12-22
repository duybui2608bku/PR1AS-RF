import { Document } from "mongoose";

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
  coords: {
    latitude: number | null;
    longitude: number | null;
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
  last_active_role: UserRole;
  worker_profile: WorkerProfile | null;
  client_profile: ClientProfile | null;
  coords: {
    latitude: number | null;
    longitude: number | null;
  };
  created_at: Date;
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
