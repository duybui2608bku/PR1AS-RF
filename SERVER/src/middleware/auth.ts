import { Request, Response, NextFunction } from "express";
import { verifyToken, JWTPayload } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { UserRole } from "../types/auth/user.types";
import { AUTH_MESSAGES, AUTHZ_MESSAGES } from "../constants/messages";
import { getFreshUserStatus } from "../utils/userStatusCache";
import { accountStatusError } from "../utils/user-status";

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

// HTTP verbs that change server state. Only these pay the canonical-status
// re-check by default; safe reads trust the JWT snapshot (see `authenticate`).
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const extractBearerToken = (req: Request): string | undefined => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  // Fallback: đọc từ httpOnly cookie (dành cho browser clients)
  return (req.cookies as Record<string, string | undefined>)?.token;
};

/**
 * Re-reads the canonical account status (30s TTL cache) and refuses anything
 * that isn't ACTIVE. The JWT carries a status snapshot from login time, so if
 * the admin bans/deactivates a user mid-session — or the user bashes the delete
 * button — the token still says ACTIVE and only this DB re-check catches it.
 * On success the refreshed status is written back onto `req.user`.
 */
const assertFreshStatusActive = async (req: AuthRequest): Promise<void> => {
  const decoded = req.user;
  if (!decoded) {
    throw AppError.unauthorized(AUTH_MESSAGES.LOGIN_REQUIRED);
  }
  const freshStatus = await getFreshUserStatus(decoded.sub);
  const statusError = accountStatusError(freshStatus);
  if (statusError) {
    throw statusError;
  }
  req.user = { ...decoded, status: freshStatus! };
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
    req.user = verifyToken(token);
    // Mutations always re-check the canonical status so a banned/deactivated
    // user is locked out within the cache TTL. Safe reads (GET/HEAD/OPTIONS)
    // skip the Mongo hit and trust the JWT snapshot; a sensitive read can opt
    // back in by chaining `enforceFreshStatus` after this middleware.
    if (MUTATION_METHODS.has(req.method.toUpperCase())) {
      await assertFreshStatusActive(req);
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Opt-in status re-check for routes that need a fresh status on an otherwise
 * "safe" verb (e.g. a GET that exposes sensitive data). Must run after
 * `authenticate`. Idempotent with the mutation path — for a mutation the cache
 * is already warm, so the extra call is a cheap in-memory lookup.
 */
export const enforceFreshStatus = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await assertFreshStatusActive(req);
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
