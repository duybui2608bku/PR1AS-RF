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

export interface IUser {
  email: string;
  password_hash: string;
  avatar?: string;
  full_name?: string;
  phone?: string;
  roles: UserRole[];
  status: UserStatus;
  verify_email: boolean;
  created_at: Date;
  last_login: Date | null;
  coords: {
    latitude: number;
    longitude: number;
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
}
