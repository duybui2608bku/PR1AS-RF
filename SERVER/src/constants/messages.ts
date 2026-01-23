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

export const BOOKING_MESSAGES = {
  BOOKING_NOT_FOUND: "Booking not found",
  BOOKING_CREATED: "Booking created successfully",
  BOOKING_UPDATED: "Booking updated successfully",
  BOOKING_CANCELLED: "Booking cancelled successfully",
  BOOKING_STATUS_UPDATED: "Booking status updated successfully",
  BOOKINGS_FETCHED: "Bookings fetched successfully",
  BOOKING_FETCHED: "Booking fetched successfully",
  INVALID_SCHEDULE: "Invalid schedule. Start time must be before end time",
  INVALID_SCHEDULE_ADVANCE:
    "Booking must be scheduled at least 2 hours in advance",
  INVALID_SCHEDULE_MAX_ADVANCE:
    "Booking cannot be scheduled more than 30 days in advance",
  INVALID_DURATION: "Duration must be between 1 and 24 hours",
  INVALID_PRICING: "Invalid pricing information",
  INVALID_STATUS_TRANSITION: "Invalid status transition",
  CANNOT_CANCEL_COMPLETED: "Cannot cancel a completed booking",
  CANNOT_CANCEL_CANCELLED: "Booking is already cancelled",
  CANNOT_UPDATE_COMPLETED: "Cannot update a completed booking",
  CANNOT_UPDATE_CANCELLED: "Cannot update a cancelled booking",
  UNAUTHORIZED_ACCESS: "You do not have permission to access this booking",
  WORKER_SERVICE_NOT_FOUND: "Worker service not found",
  SERVICE_NOT_FOUND: "Service not found",
  USER_NOT_FOUND: "User not found",
} as const;

export const REVIEW_MESSAGES = {
  REVIEW_NOT_FOUND: "Review not found",
  REVIEW_CREATED: "Review created successfully",
  REVIEW_UPDATED: "Review updated successfully",
  REVIEW_DELETED: "Review deleted successfully",
  REVIEW_REPLIED: "Review reply added successfully",
  REVIEWS_FETCHED: "Reviews fetched successfully",
  REVIEW_FETCHED: "Review fetched successfully",
  REVIEW_ALREADY_EXISTS: "Review already exists for this booking",
  INVALID_RATING: "Rating must be between 1 and 5",
  INVALID_RATING_DETAILS: "All rating details must be between 1 and 5",
  INVALID_COMMENT_LENGTH: "Comment must be between 10 and 1000 characters",
  INVALID_REPLY_LENGTH: "Reply must not exceed 500 characters",
  CANNOT_UPDATE_REVIEW: "Cannot update review after approval",
  CANNOT_DELETE_REVIEW: "Cannot delete review",
  UNAUTHORIZED_ACCESS: "You do not have permission to access this review",
  BOOKING_NOT_COMPLETED: "Cannot review a booking that is not completed",
  BOOKING_NOT_FOUND: "Booking not found",
  AT_LEAST_ONE_FIELD_MUST_BE_PROVIDED_FOR_UPDATE:
    "At least one field must be provided for update",
  RATING_MUST_BE_CONSISTENT_WITH_RATING_DETAILS:
    "Rating must be consistent with rating details",
} as const;

export const ESCROW_MESSAGES = {
  ESCROW_NOT_FOUND: "Escrow transaction not found",
  ESCROWS_FETCHED: "Escrow transactions fetched successfully",
  ESCROW_FETCHED: "Escrow transaction fetched successfully",
  UNAUTHORIZED_ACCESS:
    "You do not have permission to access this escrow transaction",
} as const;

export const WORKER_MESSAGES = {
  WORKERS_GROUPED_BY_SERVICE_FETCHED:
    "Workers grouped by service fetched successfully",
} as const;
