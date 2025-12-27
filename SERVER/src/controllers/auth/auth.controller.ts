import { Request, Response } from "express";
import { authService } from "../../services/auth/auth.service";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from "../../validations/auth/auth.validation";
import {
  updateLastActiveRoleSchema,
  updateWorkerProfileSchema,
  updateBasicProfileSchema,
} from "../../validations/user/user.validation";
import {
  AUTH_MESSAGES,
  COMMON_MESSAGES,
  USER_MESSAGES,
} from "../../constants/messages";
import { AuthRequest } from "../../middleware/auth";
import { AppError, R, validateWithSchema } from "../../utils";
import * as userService from "../../services/user/user.service";
import { WorkerProfile } from "../../types";
import { toPublicUser } from "../../utils/user.helper";

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

    R.success(
      res,
      { user: toPublicUser(updatedUser) },
      USER_MESSAGES.ROLE_UPDATED
    );
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized(AUTH_MESSAGES.TOKEN_INVALID);
    }

    const body = validateWithSchema(
      updateWorkerProfileSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const updatedUser = await userService.updateWorkerProfile(
      req.user.sub,
      body.worker_profile as Partial<WorkerProfile>
    );

    R.success(
      res,
      { user: toPublicUser(updatedUser) },
      "Profile updated successfully"
    );
  }

  async updateBasicProfile(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized(AUTH_MESSAGES.TOKEN_INVALID);
    }

    const body = validateWithSchema(
      updateBasicProfileSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const updatedUser = await userService.updateBasicProfile(
      req.user.sub,
      body
    );

    R.success(
      res,
      { user: toPublicUser(updatedUser) },
      AUTH_MESSAGES.PROFILE_UPDATED
    );
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    const data = validateWithSchema(
      forgotPasswordSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const result = await authService.forgotPassword(data.email);
    R.success(res, result, result.message);
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    const data = validateWithSchema(
      resetPasswordSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const result = await authService.resetPassword(data.token, data.password);
    R.success(res, result, result.message);
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    const data = validateWithSchema(
      verifyEmailSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const result = await authService.verifyEmail(data.token);
    R.success(res, result, result.message);
  }

  async resendVerificationEmail(req: Request, res: Response): Promise<void> {
    const data = validateWithSchema(
      resendVerificationSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const result = await authService.resendVerificationEmail(data.email);
    R.success(res, result, result.message);
  }
}

export const authController = new AuthController();
