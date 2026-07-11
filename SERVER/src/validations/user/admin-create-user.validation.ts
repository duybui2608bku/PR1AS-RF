import { z } from "zod";

import { UserRole, UserStatus } from "../../types/auth/user.types";
import { PricingUnit } from "../../types/worker/worker-service";
import { AUTH_MESSAGES, USER_MESSAGES } from "../../constants/messages";
import { VALIDATION_LIMITS } from "../../constants/validation";
import { WORKER_SERVICE_HASHTAG_LIMITS } from "../../constants/worker-service";
import { normalizeAvatarUrl } from "../../utils/avatar-url";
import { updateWorkerProfileSchema } from "./user.validation";

export const avatarUrlSchema = z.string().transform((value, ctx) => {
  const normalized = normalizeAvatarUrl(value);
  if (!normalized) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: USER_MESSAGES.INVALID_AVATAR_URL,
    });
    return z.NEVER;
  }
  return normalized;
});

// Pricing rows for a worker's service offering. Mirrors the shape enforced in
// worker-service.validation but keyed by service_code (admin picks a service
// from the catalogue) instead of service_id.
const pricingSchema = z
  .object({
    unit: z.nativeEnum(PricingUnit, {
      errorMap: () => ({
        message: `unit must be one of: ${Object.values(PricingUnit).join(", ")}`,
      }),
    }),
    duration: z.coerce
      .number({ invalid_type_error: "duration must be a number" })
      .int({ message: "duration must be an integer" })
      .min(1, { message: "duration must be at least 1" }),
    price: z.coerce
      .number({ invalid_type_error: "price must be a number" })
      .gt(0, { message: "price must be greater than 0" }),
    currency: z.string().trim().optional(),
  })
  .strict();

export const adminWorkerServiceSchema = z
  .object({
    service_code: z
      .string({ required_error: "service_code is required" })
      .trim()
      .min(1, { message: "service_code is required" })
      .transform((value) => value.toUpperCase()),
    pricing: z
      .array(pricingSchema)
      .min(1, { message: "pricing must contain at least 1 item" }),
    hashtags: z
      .array(z.string())
      .max(WORKER_SERVICE_HASHTAG_LIMITS.MAX_PER_SERVICE)
      .optional(),
  })
  .strict();

export const adminCreateUserSchema = z
  .object({
    email: z
      .string({ required_error: AUTH_MESSAGES.EMAIL_REQUIRED })
      .trim()
      .toLowerCase()
      .email({ message: AUTH_MESSAGES.EMAIL_INVALID }),
    password: z
      .string({ required_error: AUTH_MESSAGES.PASSWORD_REQUIRED })
      .min(
        VALIDATION_LIMITS.PASSWORD_MIN_LENGTH,
        AUTH_MESSAGES.PASSWORD_MIN_LENGTH
      )
      .max(
        VALIDATION_LIMITS.PASSWORD_MAX_LENGTH,
        AUTH_MESSAGES.PASSWORD_MAX_LENGTH
      ),
    full_name: z
      .string({ required_error: USER_MESSAGES.FULL_NAME_REQUIRED })
      .trim()
      .min(1, USER_MESSAGES.FULL_NAME_REQUIRED)
      .max(VALIDATION_LIMITS.FULL_NAME_MAX_LENGTH),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+\-\s()]+$/, "Phone number format is invalid")
      .max(VALIDATION_LIMITS.PHONE_MAX_LENGTH)
      .optional()
      .nullable(),
    avatar: z.union([avatarUrlSchema, z.null()]).optional(),
    roles: z
      .array(z.enum([UserRole.CLIENT, UserRole.WORKER]))
      .min(1, { message: USER_MESSAGES.INVALID_ROLE })
      .default([UserRole.CLIENT]),
    // Admin-created accounts are trusted: ACTIVE/INACTIVE/BANNED are the only
    // statuses an admin should be able to set at creation time.
    status: z
      .enum([UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.BANNED])
      .default(UserStatus.ACTIVE),
    worker_profile: updateWorkerProfileSchema.shape.worker_profile.optional(),
    worker_services: z.array(adminWorkerServiceSchema).min(1).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.roles.includes(UserRole.WORKER)) {
      if (!data.worker_profile) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["worker_profile"],
          message: USER_MESSAGES.WORKER_PROFILE_REQUIRED,
        });
      }
      if (!data.worker_services || data.worker_services.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["worker_services"],
          message: "At least one worker service is required for a worker",
        });
      }
    }
  });

export type AdminCreateUserSchemaType = z.infer<typeof adminCreateUserSchema>;
