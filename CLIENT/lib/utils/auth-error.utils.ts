import type { ApiError } from "@/lib/axios/config";
import { AuthErrorCode } from "@/lib/constants/error-codes";

const hasErrorResponse = (error: unknown): error is ApiError => {
  if (!error || typeof error !== "object") {
    return false;
  }

  return "response" in error;
};

export const isAuthErrorCode = (
  error: unknown,
  code: AuthErrorCode
): error is ApiError => {
  if (!hasErrorResponse(error)) {
    return false;
  }

  return error.response?.data?.error?.code === code;
};

export const isEmailNotVerifiedError = (error: unknown): error is ApiError => {
  return isAuthErrorCode(error, AuthErrorCode.EMAIL_NOT_VERIFIED);
};
