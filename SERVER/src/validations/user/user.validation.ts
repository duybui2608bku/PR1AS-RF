import { z } from "zod";
import { UserStatus } from "../../types/auth/user.types";
import { USER_MESSAGES } from "../../constants/messages";

/**
 * Schema validation cho update user status
 */
export const updateUserStatusSchema = z.object({
  status: z.nativeEnum(UserStatus, {
    errorMap: () => ({
      message: USER_MESSAGES.INVALID_STATUS,
    }),
  }),
});

/**
 * Schema validation cho query parameters của get users
 */
export const getUsersQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
  search: z.string().trim().optional(),
  role: z.string().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type UpdateUserStatusSchemaType = z.infer<
  typeof updateUserStatusSchema
>;
export type GetUsersQuerySchemaType = z.infer<typeof getUsersQuerySchema>;

