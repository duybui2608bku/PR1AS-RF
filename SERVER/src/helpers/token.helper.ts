import { IUserDocument } from "../types/auth/user.types";
import { generateToken, generateRefreshToken } from "../utils/jwt";
import { hashPassword } from "../utils/bcrypt";
import { User } from "../models/auth/user.model";

/**
 * Helper: Generate Token Pair & Save Refresh Token Hash
 */
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

  // Hash refresh token and save to DB
  const refreshTokenHash = await hashPassword(refreshToken);

  await User.findByIdAndUpdate(user._id, {
    refresh_token_hash: refreshTokenHash,
    last_login: new Date(),
  });

  return { token, refreshToken };
};
