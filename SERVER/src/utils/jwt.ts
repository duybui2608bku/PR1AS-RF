import jwt from "jsonwebtoken";
import { config } from "../config";
import { UserRole, UserStatus } from "../types/auth/user.types";
import { AppError } from "./AppError";
import { HTTP_STATUS } from "../constants/httpStatus";
import { AUTH_MESSAGES } from "../constants/messages";
import { ErrorCode } from "../types/common/error.types";

export interface JWTPayload {
  sub: string;
  email: string;
  roles: UserRole[];
  status: UserStatus;
  iat?: number;
  exp?: number;
}

export const generateToken = (
  payload: Omit<JWTPayload, "iat" | "exp">
): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpire,
  } as jwt.SignOptions);
};

export const generateRefreshToken = (
  payload: Omit<JWTPayload, "iat" | "exp">
): string => {
  return jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpire,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, config.jwtSecret) as JWTPayload;
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, config.jwtRefreshSecret) as JWTPayload;
  } catch {
    throw new AppError(
      AUTH_MESSAGES.REFRESH_TOKEN_EXPIRED,
      HTTP_STATUS.UNAUTHORIZED,
      ErrorCode.INVALID_TOKEN
    );
  }
};

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload | null;
  } catch {
    return null;
  }
};
