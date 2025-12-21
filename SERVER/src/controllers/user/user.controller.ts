import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ResponseHelper } from "../../utils/response";
import * as userService from "../../services/user/user.service";
import { GetUsersQuery } from "../../types/user/user.dto";
import { AppError } from "../../utils/AppError";
import { USER_MESSAGES } from "../../constants/messages";
import {
  updateUserStatusSchema,
  getUsersQuerySchema,
} from "../../validations/user/user.validation";

/**
 * Helper: Validate request body với Zod schema
 */
const validateBody = <T>(
  schema: {
    safeParse: (data: unknown) => {
      success: boolean;
      data?: T;
      error?: { errors: { path: (string | number)[]; message: string }[] };
    };
  },
  body: unknown
): T => {
  const result = schema.safeParse(body);
  if (!result.success) {
    const details = result.error!.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));
    throw AppError.badRequest(USER_MESSAGES.INVALID_STATUS, details);
  }
  return result.data as T;
};

/**
 * Helper: Validate query parameters với Zod schema
 */
const validateQuery = <T>(
  schema: {
    safeParse: (data: unknown) => {
      success: boolean;
      data?: T;
      error?: { errors: { path: (string | number)[]; message: string }[] };
    };
  },
  query: unknown
): T => {
  const result = schema.safeParse(query);
  if (!result.success) {
    const details = result.error!.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));
    throw AppError.badRequest("Query parameters không hợp lệ", details);
  }
  return result.data as T;
};

/**
 * GET /api/users
 * Lấy danh sách người dùng với filters và pagination
 */
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const query = validateQuery(getUsersQuerySchema, req.query);
  const result = await userService.getAllUsers(query as GetUsersQuery);

  ResponseHelper.success(res, result, USER_MESSAGES.USERS_FETCHED);
});

/**
 * PATCH /api/users/:id/status
 * Cập nhật trạng thái người dùng
 */
export const updateUserStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const body = validateBody(updateUserStatusSchema, req.body);

    await userService.updateUserStatus(id, body.status);

    ResponseHelper.success(res, null, USER_MESSAGES.STATUS_UPDATED);
  }
);
