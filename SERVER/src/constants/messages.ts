export const AUTH_MESSAGES = {
  WORKER_PROFILE_NOT_FOUND: "Worker profile not found",
  INVALID_DATA: "Invalid data",
  EMAIL_REQUIRED: "Email is required",
  EMAIL_INVALID: "Invalid email",
  PASSWORD_REQUIRED: "Password is required",
  PASSWORD_MIN_LENGTH: "Password must be at least 8 characters",
  TOKEN_NOT_PROVIDED: "Token not provided",
  TOKEN_INVALID: "Invalid token",
  TOKEN_EXPIRED: "Token is invalid or expired",
  REFRESH_TOKEN_INVALID: "Invalid refresh token",
  REFRESH_TOKEN_REUSE_DETECTED: "Refresh token reuse detected",
  REFRESH_TOKEN_EXPIRED: "Invalid or expired refresh token",
  USER_BANNED: "Account has been banned",
  USER_NOT_FOUND: "User not found",
  EMAIL_EXISTS: "Email already registered",
  INVALID_CREDENTIALS: "Invalid email or password",
  LOGIN_REQUIRED: "Login required",
  OLD_PASSWORD_INCORRECT: "Old password is incorrect",
  PASSWORD_CHANGE_SUCCESS: "Password changed successfully",
  RESET_TOKEN_REQUIRED: "Reset token is required",
  RESET_TOKEN_INVALID: "Invalid or expired reset token",
  RESET_TOKEN_EXPIRED: "Reset token has expired",
  PASSWORD_RESET_EMAIL_SENT:
    "If the email exists, a password reset link has been sent",
  PASSWORD_RESET_SUCCESS: "Password has been reset successfully",
  PASSWORD_RESET_FAILED: "Password reset failed",
  VERIFICATION_TOKEN_REQUIRED: "Verification token is required",
  VERIFICATION_TOKEN_INVALID: "Invalid or expired verification token",
  VERIFICATION_TOKEN_EXPIRED: "Verification token has expired",
  EMAIL_ALREADY_VERIFIED: "Email is already verified",
  EMAIL_VERIFICATION_SENT: "Verification email has been sent",
  EMAIL_VERIFICATION_SUCCESS: "Email has been verified successfully",
  EMAIL_VERIFICATION_FAILED: "Email verification failed",
  RATE_LIMIT_EXCEEDED: "Too many requests, please try again later",
  RATE_LIMIT_AUTH_EXCEEDED:
    "Too many authentication attempts, please try again later",
  LOGOUT_SUCCESS: "Logout successful",
  REGISTER_SUCCESS: "Registration successful",
  LOGIN_SUCCESS: "Login successful",
  PROFILE_UPDATED: "Profile updated successfully",
} as const;

export const AUTHZ_MESSAGES = {
  FORBIDDEN: "You do not have permission to perform this action",
  INSUFFICIENT_PERMISSIONS: "Insufficient permissions",
} as const;

export const COMMON_MESSAGES = {
  INTERNAL_SERVER_ERROR: "Internal server error occurred",
  NOT_FOUND: "Resource not found",
  BAD_REQUEST: "Invalid request",
  SUCCESS: "Success",
  CREATED: "Created successfully",
  UPDATED: "Updated successfully",
  DELETED: "Deleted successfully",
} as const;

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

export const CHAT_MESSAGES = {
  RECEIVER_NOT_FOUND: "Receiver not found",
  CANNOT_SEND_TO_SELF: "Cannot send message to yourself",
  REPLY_MESSAGE_NOT_FOUND: "Reply message not found",
  MESSAGE_SENT_SUCCESS: "Message sent successfully",
  MESSAGE_NOT_FOUND: "Message not found",
  UNAUTHORIZED_DELETE: "Unauthorized to delete this message",
  MESSAGE_DELETED_SUCCESS: "Message deleted successfully",
  CONVERSATION_NOT_FOUND: "Conversation not found",
  CONVERSATION_ID_REQUIRED: "Conversation ID is required",
  MESSAGE_ID_REQUIRED: "Message ID is required",
  MESSAGES_MARKED_READ: "Messages marked as read",
  AUTHENTICATION_REQUIRED: "Authentication required",
  FAILED_JOIN_CONVERSATION: "Failed to join conversation",
  FAILED_MARK_READ: "Failed to mark messages as read",
} as const;

export const CSRF_MESSAGES = {
  TOKEN_MISSING:
    "CSRF token missing. Please make a GET request first to obtain a CSRF token, then include it in the 'x-csrf-token' header.",
  TOKEN_MISMATCH: "CSRF token mismatch",
  INVALID_ORIGIN: "Invalid origin",
  INVALID_REFERER: "Invalid referer",
  INVALID_REFERER_FORMAT: "Invalid referer format",
  MISSING_ORIGIN: "Origin or Referer header required",
} as const;

export const WALLET_MESSAGES = {
  WALLET_NOT_FOUND: "Wallet not found",
  INSUFFICIENT_BALANCE: "Insufficient wallet balance",
  INVALID_AMOUNT: "Invalid amount",
  TRANSACTION_NOT_FOUND: "Transaction not found",
  TRANSACTION_FAILED: "Transaction failed",
  PAYMENT_VERIFICATION_FAILED: "Payment verification failed",
  DEPOSIT_AMOUNT_TOO_LOW: "Deposit amount is too low",
  DEPOSIT_AMOUNT_TOO_HIGH: "Deposit amount is too high",
  DEPOSIT_CREATED: "Deposit transaction created successfully",
  PAYMENT_VERIFIED: "Payment verified successfully",
  BALANCE_FETCHED: "Balance fetched successfully",
  TRANSACTIONS_FETCHED: "Transactions fetched successfully",
  STATS_FETCHED: "Transaction statistics fetched successfully",
  TOP_USERS_FETCHED: "Top users fetched successfully",
  CHART_DATA_FETCHED: "Chart data fetched successfully",
  INVALID_DATE_RANGE: "Invalid date range",
} as const;
