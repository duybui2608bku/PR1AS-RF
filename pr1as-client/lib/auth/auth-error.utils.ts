import { ApiError } from "@/lib/utils/error-handler"

export const isEmailNotVerifiedError = (error: unknown): boolean => {
  return error instanceof ApiError && error.code === "EMAIL_NOT_VERIFIED"
}
