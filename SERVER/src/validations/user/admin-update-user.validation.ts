import { z } from "zod";

import { UserRole, UserStatus } from "../../types/auth/user.types";
import { AUTH_MESSAGES, USER_MESSAGES } from "../../constants/messages";
import { VALIDATION_LIMITS } from "../../constants/validation";
import {
  adminWorkerServiceSchema,
  avatarUrlSchema,
} from "./admin-create-user.validation";
import { updateWorkerProfileSchema } from "./user.validation";

// Admin edit of an existing account. Mirrors the create schema but `email` and
// `password` are optional (only changed when explicitly provided).
export const adminUpdateUserSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().optional(),
    password: z
      .string()
      .min(
        VALIDATION_LIMITS.PASSWORD_MIN_LENGTH,
        AUTH_MESSAGES.PASSWORD_MIN_LENGTH
      )
      .max(VALIDATION_LIMITS.PASSWORD_MAX_LENGTH)
      .optional(),
    full_name: z
      .string()
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
      .min(1, { message: USER_MESSAGES.INVALID_ROLE }),
    status: z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.BANNED]),
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

export type AdminUpdateUserSchemaType = z.infer<typeof adminUpdateUserSchema>;
