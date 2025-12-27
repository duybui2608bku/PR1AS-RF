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
import crypto from "crypto";
import nodemailerUtils from "../../utils/nodemailer";
import {
  passwordResetTemplate,
  emailVerificationTemplate,
} from "../../utils/templage-mail";
import { config } from "../../config";
import { logger } from "../../utils/logger";
import { APP_CONSTANTS, EMAIL_SUBJECTS } from "../../constants/app";
import {
  createPasswordResetExpiry,
  createEmailVerificationExpiry,
} from "../../utils/date";
import { toPublicUser } from "../../utils/user.helper";

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const emailExists = await userRepository.emailExists(input.email);
    if (emailExists) {
      throw new AppError(
        AUTH_MESSAGES.EMAIL_EXISTS,
        HTTP_STATUS.CONFLICT,
        ErrorCode.EMAIL_EXISTS
      );
    }

    const password_hash = await hashPassword(input.password);

    const user = await userRepository.create({
      email: input.email,
      password_hash,
      full_name: input.full_name,
      phone: input.phone,
    });

    await this.sendVerificationEmail(user.email).catch((error) => {
      logger.error("Failed to send verification email during registration", {
        userId: user._id.toString(),
        email: user.email,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    const { token, refreshToken } = await generateAuthTokens(user);

    return {
      user: toPublicUser(user),
      token,
      refreshToken,
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      throw new AppError(
        AUTH_MESSAGES.INVALID_CREDENTIALS,
        HTTP_STATUS.UNAUTHORIZED,
        ErrorCode.INVALID_CREDENTIALS
      );
    }

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

    if (user.status === UserStatus.BANNED) {
      throw new AppError(
        AUTH_MESSAGES.USER_BANNED,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.USER_BANNED
      );
    }

    const { token, refreshToken } = await generateAuthTokens(user);

    return {
      user: toPublicUser(user),
      token,
      refreshToken,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const payload = verifyRefreshToken(refreshToken);

    const user = await User.findById(payload.sub).select("+refresh_token_hash");

    if (!user || !user.refresh_token_hash) {
      throw new AppError(
        AUTH_MESSAGES.REFRESH_TOKEN_INVALID,
        HTTP_STATUS.UNAUTHORIZED,
        ErrorCode.INVALID_TOKEN
      );
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
        AUTH_MESSAGES.REFRESH_TOKEN_REUSE_DETECTED,
        HTTP_STATUS.UNAUTHORIZED,
        ErrorCode.INVALID_TOKEN
      );
    }

    const tokens = await generateAuthTokens(user);

    return {
      user: toPublicUser(user),
      ...tokens,
    };
  }

  async getMe(userId: string): Promise<IUserPublic> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    return toPublicUser(user);
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await userRepository.findByEmail(email);

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenHash = await hashPassword(resetToken);
      const resetExpires = createPasswordResetExpiry();

      await User.findByIdAndUpdate(user._id, {
        password_reset_token: resetTokenHash,
        password_reset_expires: resetExpires,
      });

      const resetLink = `${config.frontendUrl}/auth/reset-password?token=${resetToken}`;

      await nodemailerUtils({
        email: user.email,
        html: passwordResetTemplate(resetLink, user.full_name || undefined),
        subject: `${APP_CONSTANTS.NAME} ${EMAIL_SUBJECTS.PASSWORD_RESET}`,
      }).catch((error) => {
        logger.error("Failed to send password reset email", {
          userId: user._id.toString(),
          email: user.email,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }

    return {
      message: AUTH_MESSAGES.PASSWORD_RESET_EMAIL_SENT,
    };
  }

  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const users = await User.find({
      password_reset_expires: { $gt: new Date() },
    }).select("+password_reset_token +password_reset_expires");

    let user: IUserDocument | null = null;

    for (const u of users) {
      const resetToken = (u as IUserDocument).password_reset_token;
      const resetExpires = (u as IUserDocument).password_reset_expires;
      if (resetToken && resetExpires) {
        const isValid = await comparePassword(token, resetToken);
        if (isValid) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      throw new AppError(
        AUTH_MESSAGES.RESET_TOKEN_INVALID,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.INVALID_TOKEN
      );
    }

    const resetExpires = (user as IUserDocument).password_reset_expires;
    if (!resetExpires || resetExpires < new Date()) {
      await User.findByIdAndUpdate(user._id, {
        password_reset_token: null,
        password_reset_expires: null,
      });
      throw new AppError(
        AUTH_MESSAGES.RESET_TOKEN_EXPIRED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.INVALID_TOKEN
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await User.findByIdAndUpdate(user._id, {
      password_hash: passwordHash,
      password_reset_token: null,
      password_reset_expires: null,
      refresh_token_hash: null,
    });

    return {
      message: AUTH_MESSAGES.PASSWORD_RESET_SUCCESS,
    };
  }

  async sendVerificationEmail(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      return;
    }

    if (user.verify_email) {
      return;
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenHash = await hashPassword(verificationToken);
    const verificationExpires = createEmailVerificationExpiry();

    await User.findByIdAndUpdate(user._id, {
      email_verification_token: verificationTokenHash,
      email_verification_expires: verificationExpires,
    });

    const verificationLink = `${config.frontendUrl}/auth/verify-email?token=${verificationToken}`;

    await nodemailerUtils({
      email: user.email,
      html: emailVerificationTemplate(verificationLink),
      subject: `${APP_CONSTANTS.NAME} ${EMAIL_SUBJECTS.EMAIL_VERIFICATION}`,
    }).catch((error) => {
      logger.error("Failed to send verification email", {
        userId: user._id.toString(),
        email: user.email,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    });
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const users = await User.find({
      email_verification_expires: { $gt: new Date() },
    }).select("+email_verification_token +email_verification_expires");

    let user: IUserDocument | null = null;

    for (const u of users) {
      const verificationToken = (u as IUserDocument).email_verification_token;
      const verificationExpires = (u as IUserDocument)
        .email_verification_expires;
      if (verificationToken && verificationExpires) {
        const isValid = await comparePassword(token, verificationToken);
        if (isValid) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      throw new AppError(
        AUTH_MESSAGES.VERIFICATION_TOKEN_INVALID,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.INVALID_TOKEN
      );
    }

    const verificationExpires = (user as IUserDocument)
      .email_verification_expires;
    if (!verificationExpires || verificationExpires < new Date()) {
      await User.findByIdAndUpdate(user._id, {
        email_verification_token: null,
        email_verification_expires: null,
      });
      throw new AppError(
        AUTH_MESSAGES.VERIFICATION_TOKEN_EXPIRED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.INVALID_TOKEN
      );
    }

    if (user.verify_email) {
      await User.findByIdAndUpdate(user._id, {
        email_verification_token: null,
        email_verification_expires: null,
      });
      throw new AppError(
        AUTH_MESSAGES.EMAIL_ALREADY_VERIFIED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.INVALID_TOKEN
      );
    }

    await User.findByIdAndUpdate(user._id, {
      verify_email: true,
      email_verification_token: null,
      email_verification_expires: null,
    });

    return {
      message: AUTH_MESSAGES.EMAIL_VERIFICATION_SUCCESS,
    };
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await userRepository.findByEmail(email);
    if (user) {
      if (!user.verify_email) {
        await this.sendVerificationEmail(email).catch((error) => {
          logger.error("Failed to resend verification email", {
            userId: user._id.toString(),
            email: user.email,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }
    }

    return {
      message: AUTH_MESSAGES.EMAIL_VERIFICATION_SENT,
    };
  }
}

export const authService = new AuthService();
