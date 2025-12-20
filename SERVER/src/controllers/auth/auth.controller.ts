import { Request, Response } from "express";
import { authService } from "../../services/auth/auth.service";
import {
  registerSchema,
  loginSchema,
} from "../../validations/auth/auth.validation";
import { AppError } from "../../utils/AppError";
import { AUTH_MESSAGES } from "../../constants/messages";
import { AuthRequest } from "../../middleware/auth";
import { R } from "../../utils/response";

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
}

export const authController = new AuthController();
