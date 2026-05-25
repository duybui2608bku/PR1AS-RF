import crypto from "crypto";
import { IUserDocument } from "../types/auth/user.types";
import { generateToken, generateRefreshToken } from "../utils/jwt";
import { userRepository } from "../repositories/auth/user.repository";

export const hashOpaqueToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

export const generateAuthTokens = async (
  user: IUserDocument
): Promise<{ token: string; refreshToken: string }> => {
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    roles: user.roles,
    status: user.status,
  };
  const token = generateToken(payload);
  const refreshToken = generateRefreshToken(payload);
  const refreshTokenHash = hashOpaqueToken(refreshToken);
  await userRepository.setRefreshTokenHash(
    user._id.toString(),
    refreshTokenHash
  );

  return { token, refreshToken };
};
