import { Request, Response } from "express";
import { PaginationHelper } from "../../utils/pagination";
import * as userService from "../../services/user/user.service";
import { GetUsersQuery } from "../../types/user/user.dto";
import { PAGINATION_MESSAGES, USER_MESSAGES } from "../../constants/messages";
import { PaginationRequest } from "../../middleware/pagination";
import {
  updateUserStatusSchema,
  getUsersQuerySchema,
} from "../../validations/user/user.validation";
import { ResponseHelper, validateWithSchema } from "../../utils";

export const getUsers = async (req: PaginationRequest, res: Response) => {
  const query = validateWithSchema(
    getUsersQuerySchema,
    req.query,
    PAGINATION_MESSAGES.PAGE_AND_LIMIT_REQUIRED
  );

  const { page, limit, skip } = req.pagination!;

  const { users, total } = await userService.getAllUsers({
    ...query,
    page,
    limit,
    skip,
  } as GetUsersQuery & { skip: number });

  const response = PaginationHelper.format(users, req.pagination!, total);

  ResponseHelper.success(res, response, USER_MESSAGES.USERS_FETCHED);
};

export const updateUserStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = validateWithSchema(updateUserStatusSchema, req.body);

  await userService.updateUserStatus(id, body.status);

  ResponseHelper.success(res, null, USER_MESSAGES.STATUS_UPDATED);
};
