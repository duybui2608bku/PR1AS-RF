import { COMMON_MESSAGES } from "../constants/messages";
import { AppError } from "./AppError";

type ZodSchema<T> = {
  safeParse: (data: unknown) => {
    success: boolean;
    data?: T;
    error?: { errors: { path: (string | number)[]; message: string }[] };
  };
};

/**
 * Helper chuẩn hóa validate schema và ném lỗi AppError.badRequest với details.
 */
export const validateWithSchema = <T>(
  schema: ZodSchema<T>,
  payload: unknown,
  message: string = COMMON_MESSAGES.BAD_REQUEST
): T => {
  const result = schema.safeParse(payload);
  if (!result.success) {
    const details = result.error!.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));
    throw AppError.badRequest(message, details);
  }
  return result.data as T;
};

