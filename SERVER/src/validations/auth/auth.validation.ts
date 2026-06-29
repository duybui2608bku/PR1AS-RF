import { z } from "zod";
import { AUTH_MESSAGES } from "../../constants/messages";
import { VALIDATION_LIMITS } from "../../constants/validation";

const strongPassword = z
  .string({ required_error: AUTH_MESSAGES.PASSWORD_REQUIRED })
  .min(VALIDATION_LIMITS.PASSWORD_MIN_LENGTH, AUTH_MESSAGES.PASSWORD_MIN_LENGTH)
  .max(VALIDATION_LIMITS.PASSWORD_MAX_LENGTH, AUTH_MESSAGES.PASSWORD_MAX_LENGTH)
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
    AUTH_MESSAGES.PASSWORD_COMPLEXITY
  );

export const registerSchema = z.object({
  email: z
    .string({ required_error: AUTH_MESSAGES.EMAIL_REQUIRED })
    .email(AUTH_MESSAGES.EMAIL_INVALID)
    .transform((val) => val.toLowerCase().trim()),
  password: strongPassword,
  full_name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  // Locale the user is browsing the site in, captured at signup so the very
  // first email (verification) is sent in their language. See meta_data.locale.
  locale: z.enum(["vi", "en", "zh", "ko"]).optional(),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: AUTH_MESSAGES.EMAIL_REQUIRED })
    .email(AUTH_MESSAGES.EMAIL_INVALID)
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string({ required_error: AUTH_MESSAGES.PASSWORD_REQUIRED })
    .max(VALIDATION_LIMITS.PASSWORD_MAX_LENGTH, AUTH_MESSAGES.PASSWORD_MAX_LENGTH),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: AUTH_MESSAGES.EMAIL_REQUIRED })
    .email(AUTH_MESSAGES.EMAIL_INVALID)
    .transform((val) => val.toLowerCase().trim()),
});

export const resetPasswordSchema = z.object({
  token: z.string({ required_error: AUTH_MESSAGES.RESET_TOKEN_REQUIRED }),
  password: strongPassword,
});

export const verifyEmailSchema = z.object({
  token: z.string({ required_error: AUTH_MESSAGES.VERIFICATION_TOKEN_REQUIRED }),
});

export const resendVerificationSchema = z.object({
  email: z
    .string({ required_error: AUTH_MESSAGES.EMAIL_REQUIRED })
    .email(AUTH_MESSAGES.EMAIL_INVALID)
    .transform((val) => val.toLowerCase().trim()),
});

export const deleteAccountSchema = z.object({
  password: z
    .string({ required_error: AUTH_MESSAGES.PASSWORD_REQUIRED })
    .min(1, AUTH_MESSAGES.PASSWORD_REQUIRED)
    .max(VALIDATION_LIMITS.PASSWORD_MAX_LENGTH, AUTH_MESSAGES.PASSWORD_MAX_LENGTH),
});

export type RegisterSchemaType = z.infer<typeof registerSchema>;
export type LoginSchemaType = z.infer<typeof loginSchema>;
export type ForgotPasswordSchemaType = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordSchemaType = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailSchemaType = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationSchemaType = z.infer<typeof resendVerificationSchema>;
export type DeleteAccountSchemaType = z.infer<typeof deleteAccountSchema>;
