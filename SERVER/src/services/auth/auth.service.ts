import { userRepository } from "../../repositories/auth/user.repository";
import { hashPassword, comparePassword } from "../../utils/bcrypt";
import { verifyRefreshToken } from "../../utils/jwt";
import { generateAuthTokens } from "../../utils/token";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { AUTH_MESSAGES } from "../../constants/messages";
import {
  RegisterInput,
  LoginInput,
  AuthResponse,
  RegisterResponse,
  IUserPublic,
  UserStatus,
} from "../../types/auth/user.types";
import crypto from "crypto";
import nodemailerUtils from "../../utils/nodemailer";
import {
  passwordResetTemplate,
  emailVerificationTemplate,
} from "../../utils/template-mail";
import { config } from "../../config";
import { logger } from "../../utils/logger";
import { APP_CONSTANTS, EMAIL_SUBJECTS } from "../../constants/app";
import {
  createPasswordResetExpiry,
  createEmailVerificationExpiry,
} from "../../utils/date";
import { toPublicUser } from "../../utils/user.helper";
import { pricingService } from "../pricing";

export class AuthService {
  private hashOpaqueToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  async register(input: RegisterInput): Promise<RegisterResponse> {
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

    return {
      user: toPublicUser(user),
      requires_email_verification: true,
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

    if (!user.verify_email) {
      throw new AppError(
        AUTH_MESSAGES.EMAIL_NOT_VERIFIED,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.EMAIL_NOT_VERIFIED
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

    const user = await userRepository.findByIdWithRefreshToken(payload.sub);

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

    if (!user.verify_email) {
      throw new AppError(
        AUTH_MESSAGES.EMAIL_NOT_VERIFIED,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.EMAIL_NOT_VERIFIED
      );
    }

    const isValid = await comparePassword(
      refreshToken,
      user.refresh_token_hash
    );
    if (!isValid) {
      await userRepository.clearRefreshToken(user._id.toString());
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
    await pricingService.ensureUserPlanActive(userId);
    const user = await userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound(AUTH_MESSAGES.USER_NOT_FOUND);
    }

    return toPublicUser(user);
  }

  async logout(userId: string): Promise<void> {
    await userRepository.clearRefreshToken(userId);
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await userRepository.findByEmail(email);

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenHash = this.hashOpaqueToken(resetToken);
      const resetExpires = createPasswordResetExpiry();

      await userRepository.setPasswordResetToken(
        user._id.toString(),
        resetTokenHash,
        resetExpires
      );

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
    const tokenHash = this.hashOpaqueToken(token);
    const user = await userRepository.findByPasswordResetToken(tokenHash);

    if (!user) {
      throw new AppError(
        AUTH_MESSAGES.RESET_TOKEN_INVALID,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.INVALID_TOKEN
      );
    }

    if (
      !user.password_reset_expires ||
      user.password_reset_expires < new Date()
    ) {
      await userRepository.clearPasswordResetToken(user._id.toString());
      throw new AppError(
        AUTH_MESSAGES.RESET_TOKEN_EXPIRED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.INVALID_TOKEN
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await userRepository.resetPassword(user._id.toString(), passwordHash);

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
    const verificationTokenHash = this.hashOpaqueToken(verificationToken);
    const verificationExpires = createEmailVerificationExpiry();

    await userRepository.setEmailVerificationToken(
      user._id.toString(),
      verificationTokenHash,
      verificationExpires
    );

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
    const tokenHash = this.hashOpaqueToken(token);
    const user = await userRepository.findByEmailVerificationToken(tokenHash);

    if (!user) {
      throw new AppError(
        AUTH_MESSAGES.VERIFICATION_TOKEN_INVALID,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.INVALID_TOKEN
      );
    }

    if (
      !user.email_verification_expires ||
      user.email_verification_expires < new Date()
    ) {
      await userRepository.clearEmailVerificationToken(user._id.toString());
      throw new AppError(
        AUTH_MESSAGES.VERIFICATION_TOKEN_EXPIRED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.INVALID_TOKEN
      );
    }

    if (user.verify_email) {
      await userRepository.clearEmailVerificationToken(user._id.toString());
      throw new AppError(
        AUTH_MESSAGES.EMAIL_ALREADY_VERIFIED,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.INVALID_TOKEN
      );
    }

    await userRepository.markEmailVerified(user._id.toString());

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
