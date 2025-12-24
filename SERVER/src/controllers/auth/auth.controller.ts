import { Request, Response } from "express";
import { authService } from "../../services/auth/auth.service";
import {
  registerSchema,
  loginSchema,
} from "../../validations/auth/auth.validation";
import { updateLastActiveRoleSchema } from "../../validations/user/user.validation";
import {
  AUTH_MESSAGES,
  COMMON_MESSAGES,
  USER_MESSAGES,
} from "../../constants/messages";
import { AuthRequest } from "../../middleware/auth";
import { AppError, R, validateWithSchema } from "../../utils";
import * as userService from "../../services/user/user.service";

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const data = validateWithSchema(
      registerSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await authService.register(data);
    R.created(res, result);
  }

  async login(req: Request, res: Response): Promise<void> {
    const data = validateWithSchema(
      loginSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await authService.login(data);
    R.success(res, result);
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw AppError.badRequest(AUTH_MESSAGES.TOKEN_NOT_PROVIDED);
    }
    const result = await authService.refreshToken(refreshToken);
    R.success(res, result);
  }

  async getMe(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized(AUTH_MESSAGES.TOKEN_INVALID);
    }
    const user = await authService.getMe(req.user.sub);
    R.success(res, { user });
  }

  async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie("token");
    R.success(res, { message: AUTH_MESSAGES.LOGOUT_SUCCESS });
  }

  async switchRole(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized(AUTH_MESSAGES.TOKEN_INVALID);
    }

    const body = validateWithSchema(
      updateLastActiveRoleSchema,
      req.body,
      USER_MESSAGES.INVALID_ROLE
    );

    const updatedUser = await userService.updateLastActiveRole(
      req.user.sub,
      body.last_active_role
    );

    const publicUser = {
      id: updatedUser._id.toString(),
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      full_name: updatedUser.full_name,
      phone: updatedUser.phone,
      roles: updatedUser.roles,
      status: updatedUser.status,
      last_active_role: updatedUser.last_active_role,
      verify_email: updatedUser.verify_email,
      worker_profile: updatedUser.worker_profile,
      client_profile: updatedUser.client_profile,
      created_at: updatedUser.created_at,
      coords: updatedUser.coords,
    };

    R.success(res, { user: publicUser }, USER_MESSAGES.ROLE_UPDATED);
  }
}

export const authController = new AuthController();
