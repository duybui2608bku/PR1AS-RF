import { TagColor } from "@/lib/constants/theme.constants";

export enum UserStatus {
  ACTIVE = "active",
  BANNED = "banned",
}

export enum UserRole {
  CLIENT = "client",
  WORKER = "worker",
  ADMIN = "admin",
}

export enum TableColumnKeys {
  ID = "_id",
  EMAIL = "email",
  FULL_NAME = "full_name",
  PHONE = "phone",
  ROLES = "roles",
  STATUS = "status",
  VERIFY_EMAIL = "verify_email",
  CREATED_AT = "created_at",
}

export const getStatusTagColor = (status: UserStatus): string => {
  const colorMap: Record<UserStatus, TagColor> = {
    [UserStatus.ACTIVE]: TagColor.GREEN,
    [UserStatus.BANNED]: TagColor.RED,
  };
  return colorMap[status] || TagColor.DEFAULT;
};

export const getRoleTagColor = (role: UserRole): string => {
  const colorMap: Record<UserRole, TagColor> = {
    [UserRole.CLIENT]: TagColor.BLUE,
    [UserRole.WORKER]: TagColor.PURPLE,
    [UserRole.ADMIN]: TagColor.RED,
  };
  return colorMap[role] || TagColor.DEFAULT;
};
