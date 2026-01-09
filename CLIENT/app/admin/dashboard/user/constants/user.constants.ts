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
  const colorMap: Record<UserStatus, string> = {
    [UserStatus.ACTIVE]: "green",
    [UserStatus.BANNED]: "red",
  };
  return colorMap[status] || "default";
};

export const getRoleTagColor = (role: UserRole): string => {
  const colorMap: Record<UserRole, string> = {
    [UserRole.CLIENT]: "blue",
    [UserRole.WORKER]: "purple",
    [UserRole.ADMIN]: "red",
  };
  return colorMap[role] || "default";
};
