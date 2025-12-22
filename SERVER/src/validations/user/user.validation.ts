import { z } from "zod";
import { UserStatus, UserRole } from "../../types/auth/user.types";
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
 * Schema validation cho update last_active_role
 */
export const updateLastActiveRoleSchema = z.object({
  last_active_role: z.enum([UserRole.CLIENT, UserRole.WORKER], {
    errorMap: () => ({
      message: USER_MESSAGES.INVALID_ROLE,
    }),
  }),
});

/**
 * Schema validation cho query parameters của get users
 * Note: page và limit được xử lý bởi pagination middleware, không cần validate ở đây
 */
export const getUsersQuerySchema = z.object({
  search: z.string().trim().optional(),
  role: z.string().optional(),
  status: z.nativeEnum(UserStatus).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type UpdateUserStatusSchemaType = z.infer<
  typeof updateUserStatusSchema
>;
export type UpdateLastActiveRoleSchemaType = z.infer<
  typeof updateLastActiveRoleSchema
>;
export type GetUsersQuerySchemaType = z.infer<typeof getUsersQuerySchema>;

