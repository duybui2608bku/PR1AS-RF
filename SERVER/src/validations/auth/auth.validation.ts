import { z } from "zod";
import { AUTH_MESSAGES } from "../../constants/messages";

export const registerSchema = z.object({
  email: z
    .string({ required_error: AUTH_MESSAGES.EMAIL_REQUIRED })
    .email(AUTH_MESSAGES.EMAIL_INVALID)
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string({ required_error: AUTH_MESSAGES.PASSWORD_REQUIRED })
    .min(8, AUTH_MESSAGES.PASSWORD_MIN_LENGTH),
  full_name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: AUTH_MESSAGES.EMAIL_REQUIRED })
    .email(AUTH_MESSAGES.EMAIL_INVALID)
    .transform((val) => val.toLowerCase().trim()),
  password: z.string({ required_error: AUTH_MESSAGES.PASSWORD_REQUIRED }),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: AUTH_MESSAGES.EMAIL_REQUIRED })
    .email(AUTH_MESSAGES.EMAIL_INVALID)
    .transform((val) => val.toLowerCase().trim()),
});

export const resetPasswordSchema = z.object({
  token: z.string({ required_error: AUTH_MESSAGES.RESET_TOKEN_REQUIRED }),
  password: z
    .string({ required_error: AUTH_MESSAGES.PASSWORD_REQUIRED })
    .min(8, AUTH_MESSAGES.PASSWORD_MIN_LENGTH),
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

export type RegisterSchemaType = z.infer<typeof registerSchema>;
export type LoginSchemaType = z.infer<typeof loginSchema>;
export type ForgotPasswordSchemaType = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordSchemaType = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailSchemaType = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationSchemaType = z.infer<typeof resendVerificationSchema>;
