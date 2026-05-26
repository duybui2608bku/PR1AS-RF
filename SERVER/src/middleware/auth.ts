import { Request, Response, NextFunction } from "express";
import { verifyToken, JWTPayload } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { UserRole, UserStatus } from "../types/auth/user.types";
import { AUTH_MESSAGES, AUTHZ_MESSAGES } from "../constants/messages";
import { getFreshUserStatus } from "../utils/userStatusCache";
import { ErrorCode } from "../types/common/error.types";

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

const extractBearerToken = (req: Request): string | undefined => {
  const authHeader = req.headers.authorization;
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
};

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw AppError.unauthorized(AUTH_MESSAGES.TOKEN_NOT_PROVIDED);
    }
    const decoded = verifyToken(token);
    // The JWT carries the status snapshot from login time. If the admin bans
    // a user mid-session — or the user themselves bashes the delete button —
    // the token still says ACTIVE, so we re-check the canonical DB value
    // (via a 30s TTL cache) before allowing the request.
    const freshStatus = await getFreshUserStatus(decoded.sub);
    if (!freshStatus) {
      throw AppError.forbidden(AUTH_MESSAGES.USER_DELETED, ErrorCode.USER_DELETED);
    }
    if (freshStatus === UserStatus.BANNED) {
      throw AppError.forbidden(AUTH_MESSAGES.USER_BANNED);
    }
    if (freshStatus === UserStatus.PENDING_DELETE) {
      throw AppError.forbidden(
        AUTH_MESSAGES.USER_PENDING_DELETE,
        ErrorCode.USER_PENDING_DELETE
      );
    }
    if (freshStatus === UserStatus.DELETED) {
      throw AppError.forbidden(AUTH_MESSAGES.USER_DELETED, ErrorCode.USER_DELETED);
    }
    req.user = { ...decoded, status: freshStatus };
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
