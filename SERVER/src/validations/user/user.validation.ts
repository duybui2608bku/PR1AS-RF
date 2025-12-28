import { z } from "zod";
import {
  UserStatus,
  UserRole,
  gender,
  Experience,
} from "../../types/auth/user.types";
import { USER_MESSAGES, AUTH_MESSAGES } from "../../constants/messages";
import { VALIDATION_LIMITS } from "../../constants/validation";

export const updateUserStatusSchema = z.object({
  status: z.nativeEnum(UserStatus, {
    errorMap: () => ({
      message: USER_MESSAGES.INVALID_STATUS,
    }),
  }),
});

export const updateLastActiveRoleSchema = z.object({
  last_active_role: z.enum([UserRole.CLIENT, UserRole.WORKER], {
    errorMap: () => ({
      message: USER_MESSAGES.INVALID_ROLE,
    }),
  }),
});

export const getUsersQuerySchema = z.object({
  search: z.string().trim().optional(),
  role: z.string().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type UpdateUserStatusSchemaType = z.infer<typeof updateUserStatusSchema>;
export type UpdateLastActiveRoleSchemaType = z.infer<
  typeof updateLastActiveRoleSchema
>;
export const updateWorkerProfileSchema = z.object({
  worker_profile: z.object({
    date_of_birth: z
      .union([z.string(), z.date()])
      .optional()
      .nullable()
      .transform((val) => {
        if (!val) return null;
        if (typeof val === "string") {
          return new Date(val);
        }
        return val;
      }),
    gender: z.nativeEnum(gender, {
      errorMap: () => ({
        message: USER_MESSAGES.INVALID_GENDER,
      }),
    }),
    height_cm: z.number().positive().optional().nullable(),
    weight_kg: z.number().positive().optional().nullable(),
    star_sign: z.string().optional().nullable(),
    lifestyle: z.string().optional().nullable(),
    hobbies: z.array(z.string()).optional().default([]),
    quote: z.string().optional().nullable(),
    introduction: z.string().optional().nullable(),
    gallery_urls: z.array(z.string()).optional().default([]),
    experience: z.nativeEnum(Experience).optional().nullable(),
    title: z.string().trim().max(100).optional().nullable(),
    coords: z
      .object({
        latitude: z.number().nullable(),
        longitude: z.number().nullable(),
      })
      .optional()
      .nullable(),
  }),
});

export type GetUsersQuerySchemaType = z.infer<typeof getUsersQuerySchema>;
export type UpdateWorkerProfileSchemaType = z.infer<
  typeof updateWorkerProfileSchema
>;

export const updateBasicProfileSchema = z
  .object({
    password: z
      .string()
      .min(
        VALIDATION_LIMITS.PASSWORD_MIN_LENGTH,
        AUTH_MESSAGES.PASSWORD_MIN_LENGTH
      )
      .optional(),
    old_password: z.string().optional(),
    avatar: z
      .union([z.string().url("Avatar must be a valid URL"), z.null()])
      .optional(),
    full_name: z
      .union([
        z
          .string()
          .trim()
          .min(1, "Full name cannot be empty")
          .max(
            VALIDATION_LIMITS.FULL_NAME_MAX_LENGTH,
            `Full name must not exceed ${VALIDATION_LIMITS.FULL_NAME_MAX_LENGTH} characters`
          ),
        z.null(),
      ])
      .optional(),
    phone: z
      .union([
        z
          .string()
          .trim()
          .regex(/^[0-9+\-\s()]+$/, "Phone number format is invalid")
          .max(
            VALIDATION_LIMITS.PHONE_MAX_LENGTH,
            `Phone number must not exceed ${VALIDATION_LIMITS.PHONE_MAX_LENGTH} characters`
          ),
        z.null(),
      ])
      .optional(),
  })
  .refine(
    (data) => {
      if (data.password && !data.old_password) {
        return false;
      }
      return true;
    },
    {
      message: "Old password is required when changing password",
      path: ["old_password"],
    }
  )
  .refine(
    (data) => {
      return (
        data.password !== undefined ||
        data.avatar !== undefined ||
        data.full_name !== undefined ||
        data.phone !== undefined
      );
    },
    {
      message: "At least one field must be provided for update",
    }
  );

export type UpdateBasicProfileSchemaType = z.infer<
  typeof updateBasicProfileSchema
>;
