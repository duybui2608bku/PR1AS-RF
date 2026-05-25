import { Request, Response, NextFunction } from "express";
import { verifyToken, JWTPayload } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { UserRole, UserStatus } from "../types/auth/user.types";
import { AUTH_MESSAGES, AUTHZ_MESSAGES } from "../constants/messages";

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

const extractBearerToken = (req: Request): string | undefined => {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
};

export const authenticate = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw AppError.unauthorized(AUTH_MESSAGES.TOKEN_NOT_PROVIDED);
    }
    const decoded = verifyToken(token);
    if (decoded.status === UserStatus.BANNED) {
      throw AppError.forbidden(AUTH_MESSAGES.USER_BANNED);
    }
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuthenticate = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const token = extractBearerToken(req);
    if (token) {
      req.user = verifyToken(token);
    }
  } catch {
    req.user = undefined;
  }
  next();
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized(AUTH_MESSAGES.LOGIN_REQUIRED));
    }
    const userRoles = req.user.roles || [];
    const hasPermission = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasPermission) {
      return next(AppError.forbidden(AUTHZ_MESSAGES.FORBIDDEN));
    }
    next();
  };
};

export const adminOnly = authorize(UserRole.ADMIN);
export const workerOnly = authorize(UserRole.WORKER);
export const clientOnly = authorize(UserRole.CLIENT);
