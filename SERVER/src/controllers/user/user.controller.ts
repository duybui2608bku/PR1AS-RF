import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { ResponseHelper } from "../../utils/response";
import * as userService from "../../services/user/user.service";
import { GetUsersQuery } from "../../types/user/user.dto";
import { UserStatus } from "../../types/auth/user.types";
import { AppError } from "../../utils/AppError";

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as GetUsersQuery;

  const result = await userService.getAllUsers(query);

  ResponseHelper.success(res, result, "Get users list successfully");
});

export const updateUserStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!Object.values(UserStatus).includes(status)) {
      throw AppError.badRequest("Invalid status");
    }

    await userService.updateUserStatus(id, status);

    ResponseHelper.success(res, null, "Update user status successfully");
  }
);
