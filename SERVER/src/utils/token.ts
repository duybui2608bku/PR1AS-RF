import crypto from "crypto";
import { IUserDocument } from "../types/auth/user.types";
import { generateToken, generateRefreshToken } from "../utils/jwt";
import { userRepository } from "../repositories/auth/user.repository";

export const hashOpaqueToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

/**
 * Constant-time comparison of two hex-encoded hashes. Guards the length first so
 * `timingSafeEqual` (which throws on unequal-length buffers) never throws, and so
 * an attacker can't probe length via an exception.
 */
export const timingSafeEqualHex = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

/**
 * Pure token minting — signs the access + refresh JWTs and returns them together
 * with the refresh-token hash to persist. Does NOT touch the DB, so callers
 * decide how to store the hash (fresh set on login vs. rotate-with-grace on
 * refresh).
 */
export const signAuthTokens = (
  user: IUserDocument
): { token: string; refreshToken: string; refreshTokenHash: string } => {
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    roles: user.roles,
    status: user.status,
  };
  const token = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);
  const refreshTokenHash = hashOpaqueToken(refreshToken);
  return { token, refreshToken, refreshTokenHash };
};

export const generateAuthTokens = async (
  user: IUserDocument
): Promise<{ token: string; refreshToken: string }> => {
  const { token, refreshToken, refreshTokenHash } = signAuthTokens(user);
  await userRepository.setRefreshTokenHash(
    user._id.toString(),
    refreshTokenHash
  );

  return { token, refreshToken };
};
