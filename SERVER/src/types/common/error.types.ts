export enum ErrorCode {
  // Auth errors
  EMAIL_EXISTS = "EMAIL_EXISTS",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  USER_BANNED = "USER_BANNED",

  // Validation errors
  VALIDATION_ERROR = "VALIDATION_ERROR",

  // General errors
  NOT_FOUND = "NOT_FOUND",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: ValidationErrorDetail[];
  };
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;
