import { Request, Response } from "express";
import { authService } from "../../services/auth/auth.service";
import {
  registerSchema,
  loginSchema,
} from "../../validations/auth/auth.validation";
import { updateLastActiveRoleSchema } from "../../validations/user/user.validation";
import { AppError } from "../../utils/AppError";
import { AUTH_MESSAGES } from "../../constants/messages";
import { USER_MESSAGES } from "../../constants/messages";
import { AuthRequest } from "../../middleware/auth";
import { R } from "../../utils/response";
import * as userService from "../../services/user/user.service";

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
    throw AppError.badRequest(AUTH_MESSAGES.INVALID_DATA, details);
  }
  return result.data as T;
};

export class AuthController {
  /**
   * POST /api/auth/register
   * Đăng ký tài khoản mới
   */
  async register(req: Request, res: Response): Promise<void> {
    const data = validateBody(registerSchema, req.body);
    const result = await authService.register(data);
    R.created(res, result);
  }

  /**
   * POST /api/auth/login
   * Đăng nhập
   */
  async login(req: Request, res: Response): Promise<void> {
    const data = validateBody(loginSchema, req.body);
    const result = await authService.login(data);
    R.success(res, result);
  }

  /**
   * POST /api/auth/refresh-token
   * Làm mới Access Token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw AppError.badRequest("Refresh token is required");
    }
    const result = await authService.refreshToken(refreshToken);
    R.success(res, result);
  }

  /**
   * GET /api/auth/me
   * Lấy thông tin user hiện tại
   */
  async getMe(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized(AUTH_MESSAGES.TOKEN_INVALID);
    }
    const user = await authService.getMe(req.user.sub);
    R.success(res, { user });
  }

  /**
   * POST /api/auth/logout
   * Đăng xuất (clear cookie nếu có)
   */
  async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie("token");
    R.success(res, { message: AUTH_MESSAGES.LOGOUT_SUCCESS });
  }

  /**
   * PATCH /api/auth/switch-role
   * Chuyển đổi last_active_role giữa client và worker
   */
  async switchRole(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized(AUTH_MESSAGES.TOKEN_INVALID);
    }

    const result = updateLastActiveRoleSchema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      throw AppError.badRequest(USER_MESSAGES.INVALID_ROLE, details);
    }

    const updatedUser = await userService.updateLastActiveRole(
      req.user.sub,
      result.data.last_active_role
    );

    // Trả về user với format public
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
