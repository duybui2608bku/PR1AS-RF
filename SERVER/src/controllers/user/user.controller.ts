import { Request, Response } from "express";
import { userService } from "../../services/user/user.service";
import { postService } from "../../services/post/post.service";
import { GetUsersQuery } from "../../types/user/user.dto";
import {
  PAGINATION_MESSAGES,
  USER_MESSAGES,
  POST_MESSAGES,
} from "../../constants/messages";
import { PaginationRequest } from "../../middleware/pagination";
import { AuthRequest } from "../../middleware/auth";
import {
  updateUserStatusSchema,
  getUsersQuerySchema,
} from "../../validations/user/user.validation";
import { R, validateWithSchema, PaginationHelper, extractUserIdFromRequest } from "../../utils";

export class UserController {
  async getMyPostStats(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const stats = await postService.countActivePostsByAuthor(userId);
    R.success(res, stats, POST_MESSAGES.MY_POST_STATS_FETCHED, req);
  }

  async getUsers(req: PaginationRequest, res: Response): Promise<void> {
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

    R.success(res, response, USER_MESSAGES.USERS_FETCHED, req);
  }

  async updateUserStatus(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const body = validateWithSchema(updateUserStatusSchema, req.body);

    await userService.updateUserStatus(id, body.status);

    R.success(res, null, USER_MESSAGES.STATUS_UPDATED, req);
  }
}

export const userController = new UserController();
