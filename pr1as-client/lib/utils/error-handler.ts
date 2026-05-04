import { isAxiosError } from "axios"

type ServerErrorPayload = {
  message?: string
  error?: {
    code?: string
    message?: string
  }
  errors?: Record<string, string[]>
}

export class ApiError extends Error {
  readonly code: string | undefined
  readonly statusCode: number | undefined

  constructor({ message, code, statusCode }: { message: string; code?: string; statusCode?: number }) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.statusCode = statusCode
  }
}

const extractServerMessage = (data: ServerErrorPayload | undefined): string | undefined => {
  const fieldErrors = data?.errors
  if (fieldErrors && typeof fieldErrors === "object") {
    const first = Object.values(fieldErrors).find((msgs) => Array.isArray(msgs) && msgs.length > 0)?.[0]
    if (first) return first
  }

  return data?.error?.message ?? data?.message
}

export const toApiError = (error: unknown): ApiError | null => {
  if (!isAxiosError<ServerErrorPayload>(error)) {
    return null
  }

  const data = error.response?.data
  const message = extractServerMessage(data) ?? error.message
  const code = data?.error?.code
  const statusCode = error.response?.status

  return new ApiError({ message, code, statusCode })
}

export const getErrorMessage = (error: unknown, fallback = "Có lỗi xảy ra. Vui lòng thử lại."): string => {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message || fallback
  }

  return fallback
}
