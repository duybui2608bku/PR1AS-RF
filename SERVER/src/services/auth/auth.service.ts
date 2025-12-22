import { userRepository } from "../../repositories/auth/user.repository";
import { hashPassword, comparePassword } from "../../utils/bcrypt";
import { verifyRefreshToken } from "../../utils/jwt";
import { generateAuthTokens } from "../../helpers/token.helper";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { AUTH_MESSAGES } from "../../constants/messages";
import {
  RegisterInput,
  LoginInput,
  AuthResponse,
  IUserPublic,
  IUserDocument,
  UserStatus,
} from "../../types/auth/user.types";
import { User } from "../../models/auth/user.model";

export class AuthService {
  /**
   * Chuyển đổi user document thành public user object
   */
  private toPublicUser(user: IUserDocument): IUserPublic {
    return {
      id: user._id.toString(),
      email: user.email,
      avatar: user.avatar,
      full_name: user.full_name,
      phone: user.phone,
      roles: user.roles,
      status: user.status,
      last_active_role: user.last_active_role,
      verify_email: user.verify_email,
      worker_profile: user.worker_profile,
      client_profile: user.client_profile,
      created_at: user.created_at,
      coords: user.coords,
    };
  }

  /**
   * Đăng ký tài khoản mới
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    // Kiểm tra email đã tồn tại
    const emailExists = await userRepository.emailExists(input.email);
    if (emailExists) {
      throw new AppError(
        AUTH_MESSAGES.EMAIL_EXISTS,
        HTTP_STATUS.CONFLICT,
        ErrorCode.EMAIL_EXISTS
      );
    }

    // Hash password
    const password_hash = await hashPassword(input.password);

    // Tạo user mới
    const user = await userRepository.create({
      email: input.email,
      password_hash,
      full_name: input.full_name,
      phone: input.phone,
    });

    // Generate Tokens
    const { token, refreshToken } = await generateAuthTokens(user);

    return {
      user: this.toPublicUser(user),
      token,
      refreshToken,
    };
  }

  /**
   * Đăng nhập
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    // Tìm user theo email
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      throw new AppError(
        AUTH_MESSAGES.INVALID_CREDENTIALS,
        HTTP_STATUS.UNAUTHORIZED,
        ErrorCode.INVALID_CREDENTIALS
      );
    }

    // So sánh password
    const isPasswordValid = await comparePassword(
      input.password,
      user.password_hash
    );
    if (!isPasswordValid) {
      throw new AppError(
        AUTH_MESSAGES.INVALID_CREDENTIALS,
        HTTP_STATUS.UNAUTHORIZED,
        ErrorCode.INVALID_CREDENTIALS
      );
    }

    // Kiểm tra trạng thái tài khoản
    if (user.status === UserStatus.BANNED) {
      throw new AppError(
        AUTH_MESSAGES.USER_BANNED,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.USER_BANNED
      );
    }

    // Generate Tokens
    const { token, refreshToken } = await generateAuthTokens(user);

    return {
      user: this.toPublicUser(user),
      token,
      refreshToken,
    };
  }

  /**
   * Refresh Token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const payload = verifyRefreshToken(refreshToken);

      const user = await User.findById(payload.sub).select(
        "+refresh_token_hash"
      );

      if (!user || !user.refresh_token_hash) {
        throw new AppError("Invalid refresh token", HTTP_STATUS.UNAUTHORIZED);
      }

      if (user.status === UserStatus.BANNED) {
        throw new AppError(AUTH_MESSAGES.USER_BANNED, HTTP_STATUS.FORBIDDEN);
      }

      const isValid = await comparePassword(
        refreshToken,
        user.refresh_token_hash
      );
      if (!isValid) {
        await User.findByIdAndUpdate(user._id, { refresh_token_hash: null });
        throw new AppError(
          "Refresh token reuse detected",
          HTTP_STATUS.UNAUTHORIZED
        );
      }

      const tokens = await generateAuthTokens(user);

      return {
        user: this.toPublicUser(user),
        ...tokens,
      };
    } catch (error) {
      throw new AppError(
        "Invalid or expired refresh token",
        HTTP_STATUS.UNAUTHORIZED
      );
    }
  }

  /**
   * Lấy thông tin user hiện tại
   */
  async getMe(userId: string): Promise<IUserPublic> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    return this.toPublicUser(user);
  }
}

export const authService = new AuthService();
