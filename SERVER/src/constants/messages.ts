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
  REFRESH_TOKEN_INVALID: "Invalid refresh token",
  REFRESH_TOKEN_REUSE_DETECTED: "Refresh token reuse detected",
  REFRESH_TOKEN_EXPIRED: "Invalid or expired refresh token",

  // User status
  USER_BANNED: "Account has been banned",
  USER_NOT_FOUND: "User not found",
  EMAIL_EXISTS: "Email already registered",

  // Credentials
  INVALID_CREDENTIALS: "Invalid email or password",
  LOGIN_REQUIRED: "Login required",
  OLD_PASSWORD_INCORRECT: "Old password is incorrect",
  PASSWORD_CHANGE_SUCCESS: "Password changed successfully",

  // Password Reset
  RESET_TOKEN_REQUIRED: "Reset token is required",
  RESET_TOKEN_INVALID: "Invalid or expired reset token",
  RESET_TOKEN_EXPIRED: "Reset token has expired",
  PASSWORD_RESET_EMAIL_SENT: "If the email exists, a password reset link has been sent",
  PASSWORD_RESET_SUCCESS: "Password has been reset successfully",
  PASSWORD_RESET_FAILED: "Password reset failed",

  // Email Verification
  VERIFICATION_TOKEN_REQUIRED: "Verification token is required",
  VERIFICATION_TOKEN_INVALID: "Invalid or expired verification token",
  VERIFICATION_TOKEN_EXPIRED: "Verification token has expired",
  EMAIL_ALREADY_VERIFIED: "Email is already verified",
  EMAIL_VERIFICATION_SENT: "Verification email has been sent",
  EMAIL_VERIFICATION_SUCCESS: "Email has been verified successfully",
  EMAIL_VERIFICATION_FAILED: "Email verification failed",

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: "Too many requests, please try again later",
  RATE_LIMIT_AUTH_EXCEEDED: "Too many authentication attempts, please try again later",

  // Success
  LOGOUT_SUCCESS: "Logout successful",
  REGISTER_SUCCESS: "Registration successful",
  LOGIN_SUCCESS: "Login successful",
  PROFILE_UPDATED: "Profile updated successfully",
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
  INVALID_GENDER: "Invalid gender",
  STATUS_UPDATED: "User status updated successfully",
  ROLE_UPDATED: "Active role updated successfully",
  USERS_FETCHED: "Users fetched successfully",
  PROFILE_UPDATED: "Profile updated successfully",
} as const;

export const PAGINATION_MESSAGES = {
  PAGE_NOT_FOUND: "Page not found",
  LIMIT_NOT_FOUND: "Limit not found",
  PAGE_AND_LIMIT_NOT_FOUND: "Page and limit not found",
  PAGE_AND_LIMIT_INVALID: "Page and limit must be numbers",
  PAGE_AND_LIMIT_MIN_VALUE: "Page and limit must be greater than 0",
  PAGE_AND_LIMIT_MAX_VALUE: "Page and limit must be less than 100",
  PAGE_AND_LIMIT_REQUIRED: "Page and limit are required",
} as const;
