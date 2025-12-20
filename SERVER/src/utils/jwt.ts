import jwt from "jsonwebtoken";
import { config } from "../config";
import { UserRole, UserStatus } from "../types/auth/user.types";

export interface JWTPayload {
  sub: string; // userId
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

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, config.jwtSecret) as JWTPayload;
};

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload | null;
  } catch {
    return null;
  }
};
