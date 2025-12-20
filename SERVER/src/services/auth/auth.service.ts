import { userRepository } from "../../repositories/auth/user.repository";
import { hashPassword, comparePassword } from "../../utils/bcrypt";
import { generateToken } from "../../utils/jwt";
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
      verify_email: user.verify_email,
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

    // Generate JWT token
    const token = generateToken({
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles,
      status: user.status,
    });

    return {
      user: this.toPublicUser(user),
      token,
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

    // Cập nhật last_login
    await userRepository.updateLastLogin(user._id.toString());

    // Generate JWT token
    const token = generateToken({
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles,
      status: user.status,
    });

    return {
      user: this.toPublicUser(user),
      token,
    };
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
