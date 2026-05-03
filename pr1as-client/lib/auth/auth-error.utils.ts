import type { ApiError } from "@/lib/axios"

const hasErrorResponse = (error: unknown): error is ApiError => {
  if (!error || typeof error !== "object") {
    return false
  }

  return "response" in error
}

export const isEmailNotVerifiedError = (error: unknown): error is ApiError => {
  if (!hasErrorResponse(error)) {
    return false
  }

  return error.response?.data?.error?.code === "EMAIL_NOT_VERIFIED"
}
