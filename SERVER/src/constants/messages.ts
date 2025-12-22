/**
 * Centralized messages constants
 * Centralized management of error and success messages
 */

/**
 * Auth Messages - Authentication related messages
 */
export const AUTH_MESSAGES = {
  // Validation
  INVALID_DATA: "Invalid data",
  EMAIL_REQUIRED: "Email is required",
  EMAIL_INVALID: "Invalid email",
  PASSWORD_REQUIRED: "Password is required",
  PASSWORD_MIN_LENGTH: "Password must be at least 8 characters",

  // Token
  TOKEN_NOT_PROVIDED: "Token not provided",
  TOKEN_INVALID: "Invalid token",
  TOKEN_EXPIRED: "Token is invalid or expired",

  // User status
  USER_BANNED: "Account has been banned",
  USER_NOT_FOUND: "User not found",
  EMAIL_EXISTS: "Email already registered",

  // Credentials
  INVALID_CREDENTIALS: "Invalid email or password",
  LOGIN_REQUIRED: "Login required",

  // Success
  LOGOUT_SUCCESS: "Logout successful",
  REGISTER_SUCCESS: "Registration successful",
  LOGIN_SUCCESS: "Login successful",
} as const;

/**
 * Authorization Messages - Authorization related messages
 */
export const AUTHZ_MESSAGES = {
  FORBIDDEN: "You do not have permission to perform this action",
  INSUFFICIENT_PERMISSIONS: "Insufficient permissions",
} as const;

/**
 * Common Messages - Common messages
 */
export const COMMON_MESSAGES = {
  INTERNAL_SERVER_ERROR: "Internal server error occurred",
  NOT_FOUND: "Resource not found",
  BAD_REQUEST: "Invalid request",
  SUCCESS: "Success",
  CREATED: "Created successfully",
  UPDATED: "Updated successfully",
  DELETED: "Deleted successfully",
} as const;

/**
 * Validation Messages - Common validation messages
 */
export const VALIDATION_MESSAGES = {
  REQUIRED: (field: string) => `${field} is required`,
  INVALID: (field: string) => `${field} is invalid`,
  MIN_LENGTH: (field: string, length: number) =>
    `${field} must be at least ${length} characters`,
  MAX_LENGTH: (field: string, length: number) =>
    `${field} must not exceed ${length} characters`,
  MIN_VALUE: (field: string, value: number) =>
    `${field} must be greater than or equal to ${value}`,
  MAX_VALUE: (field: string, value: number) =>
    `${field} must be less than or equal to ${value}`,
} as const;

/**
 * User Messages - User management related messages
 */
export const USER_MESSAGES = {
  USER_NOT_FOUND: "User not found",
  INVALID_STATUS: "Invalid status",
  INVALID_ROLE: "Invalid role. Role must be 'client' or 'worker'",
  STATUS_UPDATED: "User status updated successfully",
  ROLE_UPDATED: "Active role updated successfully",
  USERS_FETCHED: "Users fetched successfully",
} as const;
