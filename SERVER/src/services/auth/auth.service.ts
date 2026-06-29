import { userRepository } from "../../repositories/auth/user.repository";
import { hashPassword, comparePassword } from "../../utils/bcrypt";
import { verifyRefreshToken } from "../../utils/jwt";
import {
  generateAuthTokens,
  signAuthTokens,
  hashOpaqueToken,
  timingSafeEqualHex,
} from "../../utils/token";
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
  IUserDocument,
  UserStatus,
} from "../../types/auth/user.types";
import crypto from "crypto";
import nodemailerUtils from "../../utils/nodemailer";
import {
  passwordResetTemplate,
  emailVerificationTemplate,
  passwordChangedTemplate,
} from "../../utils/template-mail";
import { config } from "../../config";
import { logger } from "../../utils/logger";
import { LOGIN_LOCKOUT, REFRESH_TOKEN } from "../../constants/app";
import { Locale } from "../../utils/i18n";
import { TIME_IN_MS } from "../../constants/time";
import {
  createPasswordResetExpiry,
  createEmailVerificationExpiry,
} from "../../utils/date";
import { toPublicUser } from "../../utils/user.helper";
import { OAuth2Client } from "google-auth-library";
import { accountDeletionService } from "./account-deletion.service";

const googleOAuthClient = new OAuth2Client(config.googleClientId);

// Equalises bcrypt cost between "user exists" and "user missing" paths in login
// so response time can't be used as an account-existence oracle. Hashed once on
// first use against a random secret; the value is never compared in practice.
let dummyPasswordHashPromise: Promise<string> | null = null;
const getDummyPasswordHash = (): Promise<string> => {
  if (!dummyPasswordHashPromise) {
    dummyPasswordHashPromise = hashPassword(
      crypto.randomBytes(32).toString("hex")
    );
  }
  return dummyPasswordHashPromise;
};

export class AuthService {
  private hashOpaqueToken(token: string): string {
    return hashOpaqueToken(token);
  }

  /**
   * Same response shape regardless of whether email already exists, to prevent
   * account enumeration. Mirrors the policy already used by forgotPassword.
   */
  async register(input: RegisterInput): Promise<RegisterResponse> {
    const existing = await userRepository.findByEmail(input.email);

    if (existing) {
      if (!existing.verify_email) {
        // Legit user retrying signup before verifying — resend the verification mail.
        await this.sendVerificationEmailToUser(existing).catch((error) => {
          logger.error(
            "Failed to resend verification email on duplicate register",
            {
              userId: existing._id.toString(),
              error: error instanceof Error ? error.message : String(error),
            }
          );
        });
      }
      return { requires_email_verification: true };
    }

    const password_hash = await hashPassword(input.password);

    const user = await userRepository.create({
      email: input.email,
      password_hash,
      full_name: input.full_name,
      phone: input.phone,
    });

    await this.sendVerificationEmailToUser(user).catch((error) => {
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

    // Account-level lockout BEFORE bcrypt — once the user is locked, even
    // valid credentials are rejected until the window passes. This is the
    // defense against IP-rotated brute force where per-IP rate limits don't
    // bite (one attempt per stolen IP can still sweep a password list).
    if (user && user.locked_until && user.locked_until.getTime() > Date.now()) {
      throw AppError.tooManyRequests(
        AUTH_MESSAGES.ACCOUNT_LOCKED,
        Math.ceil((user.locked_until.getTime() - Date.now()) / 1000),
        ErrorCode.ACCOUNT_LOCKED
      );
    }

    // Always run bcrypt — even when the user is missing or has no password —
    // so response time doesn't leak account existence. The dummy hash is a
    // random secret hashed once at startup; comparePassword against it will
    // always return false but pays the same CPU cost as a real comparison.
    const hashToCompare = user?.password_hash ?? (await getDummyPasswordHash());
    const isPasswordValid = await comparePassword(
      input.password,
      hashToCompare
    );

    if (!user || !user.password_hash || !isPasswordValid) {
      if (user) {
        const lockUntil = new Date(
          Date.now() + LOGIN_LOCKOUT.LOCK_DURATION_MINUTES * TIME_IN_MS.MINUTE
        );
        const result = await userRepository
          .incrementFailedLoginAttempts(user._id.toString(), {
            threshold: LOGIN_LOCKOUT.MAX_FAILED_ATTEMPTS,
            lockUntil,
          })
          .catch((error) => {
            logger.warn("Failed to increment login attempts", {
              error,
              userId: user._id.toString(),
            });
            return null;
          });
        if (result?.lockedUntil && result.lockedUntil.getTime() > Date.now()) {
          throw AppError.tooManyRequests(
            AUTH_MESSAGES.ACCOUNT_LOCKED,
            Math.ceil((result.lockedUntil.getTime() - Date.now()) / 1000),
            ErrorCode.ACCOUNT_LOCKED
          );
        }
      }
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

    if (user.status === UserStatus.DELETED) {
      throw new AppError(
        AUTH_MESSAGES.USER_DELETED,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.USER_DELETED
      );
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new AppError(
        AUTH_MESSAGES.USER_INACTIVE,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.USER_INACTIVE
      );
    }

    // PENDING_DELETE users get auto-restored on successful login. The grace
    // window exists exactly so users can change their mind by signing in.
    if (user.status === UserStatus.PENDING_DELETE) {
      await accountDeletionService.restoreOnLogin(user._id.toString());
      user.status = UserStatus.ACTIVE;
      user.deleted_at = null;
    }

    if (!user.verify_email) {
      throw new AppError(
        AUTH_MESSAGES.EMAIL_NOT_VERIFIED,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.EMAIL_NOT_VERIFIED
      );
    }

    // Successful auth — clear the failed-attempt counter so a future bad
    // session doesn't ride on top of an already-elevated counter.
    if ((user.failed_login_attempts ?? 0) > 0 || user.locked_until) {
      await userRepository
        .resetFailedLoginAttempts(user._id.toString())
        .catch((error) => {
          logger.warn("Failed to reset login attempt counter", {
            error,
            userId: user._id.toString(),
          });
        });
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

    if (user.status === UserStatus.INACTIVE) {
      throw new AppError(
        AUTH_MESSAGES.USER_INACTIVE,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.USER_INACTIVE
      );
    }

    if (
      user.status === UserStatus.PENDING_DELETE ||
      user.status === UserStatus.DELETED
    ) {
      // Refresh tokens are cleared on PENDING_DELETE; this branch only fires
      // if the client somehow held on to a valid one. Reject so they have to
      // go through /login (which can auto-restore on success).
      throw new AppError(
        user.status === UserStatus.DELETED
          ? AUTH_MESSAGES.USER_DELETED
          : AUTH_MESSAGES.USER_PENDING_DELETE,
        HTTP_STATUS.FORBIDDEN,
        user.status === UserStatus.DELETED
          ? ErrorCode.USER_DELETED
          : ErrorCode.USER_PENDING_DELETE
      );
    }

    if (!user.verify_email) {
      throw new AppError(
        AUTH_MESSAGES.EMAIL_NOT_VERIFIED,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.EMAIL_NOT_VERIFIED
      );
    }

    const presentedHash = hashOpaqueToken(refreshToken);
    const currentHash = user.refresh_token_hash;
    const matchesCurrent =
      !!currentHash && timingSafeEqualHex(presentedHash, currentHash);
    // Within the grace window the immediately-previous token is still accepted,
    // so concurrent refreshes from sibling tabs/devices (all presenting the same
    // pre-rotation token via the shared httpOnly cookie) succeed instead of
    // tripping reuse detection and logging everyone out.
    const withinGrace =
      !!user.refresh_token_rotated_at &&
      Date.now() - user.refresh_token_rotated_at.getTime() <
        REFRESH_TOKEN.REUSE_GRACE_MS;
    const matchesPrevious =
      withinGrace &&
      !!user.previous_refresh_token_hash &&
      timingSafeEqualHex(presentedHash, user.previous_refresh_token_hash);

    if (!matchesCurrent && !matchesPrevious) {
      // Neither the current nor the in-grace previous token matched — treat as
      // replay of a long-rotated/stolen token and revoke the whole session.
      await userRepository.clearRefreshToken(user._id.toString());
      throw new AppError(
        AUTH_MESSAGES.REFRESH_TOKEN_REUSE_DETECTED,
        HTTP_STATUS.UNAUTHORIZED,
        ErrorCode.INVALID_TOKEN
      );
    }

    const {
      token,
      refreshToken: newRefreshToken,
      refreshTokenHash,
    } = signAuthTokens(user);
    await userRepository.rotateRefreshTokenHash(
      user._id.toString(),
      refreshTokenHash
    );

    return {
      user: toPublicUser(user),
      token,
      refreshToken: newRefreshToken,
    };
  }

  async getMe(userId: string): Promise<IUserPublic> {
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
    // Dispatch in the background so response latency is constant regardless
    // of whether the email exists. The DB lookup, token write, and SMTP
    // roundtrip were previously inside the request path and leaked existence
    // via timing even though the message itself is generic.
    setImmediate(() => {
      void this.dispatchPasswordResetEmail(email).catch((error) => {
        logger.error("Background password reset dispatch failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    });

    return {
      message: AUTH_MESSAGES.PASSWORD_RESET_EMAIL_SENT,
    };
  }

  private async dispatchPasswordResetEmail(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user || user.status === UserStatus.BANNED) {
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = this.hashOpaqueToken(resetToken);
    const resetExpires = createPasswordResetExpiry();

    await userRepository.setPasswordResetToken(
      user._id.toString(),
      resetTokenHash,
      resetExpires
    );

    const resetLink = `${config.frontendUrl}/reset-password?token=${resetToken}`;

    const locale = (user.meta_data?.locale ?? "en") as Locale;
    const { subject: resetSubject, html: resetHtml } = passwordResetTemplate(
      resetLink,
      user.full_name || undefined,
      locale
    );
    await nodemailerUtils({
      email: user.email,
      html: resetHtml,
      subject: resetSubject,
    }).catch((error) => {
      logger.error("Failed to send password reset email", {
        userId: user._id.toString(),
        email: user.email,
        error: error instanceof Error ? error.message : String(error),
      });
    });
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

    // Fire-and-forget security notification — never let a mail failure turn a
    // successful reset into an error response.
    const locale = (user.meta_data?.locale ?? "en") as Locale;
    const { subject, html } = passwordChangedTemplate(
      user.full_name || undefined,
      locale
    );
    setImmediate(() => {
      void nodemailerUtils({ email: user.email, html, subject }).catch(
        (error) => {
          logger.error("Failed to send password-changed notification", {
            userId: user._id.toString(),
            error: error instanceof Error ? error.message : String(error),
          });
        }
      );
    });

    return {
      message: AUTH_MESSAGES.PASSWORD_RESET_SUCCESS,
    };
  }

  async sendVerificationEmail(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user || user.verify_email) return;
    await this.sendVerificationEmailToUser(user);
  }

  private async sendVerificationEmailToUser(
    user: IUserDocument
  ): Promise<void> {
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenHash = this.hashOpaqueToken(verificationToken);
    const verificationExpires = createEmailVerificationExpiry();

    await userRepository.setEmailVerificationToken(
      user._id.toString(),
      verificationTokenHash,
      verificationExpires
    );

    const verificationLink = `${config.frontendUrl}/verify-email?token=${verificationToken}`;

    const locale = (user.meta_data?.locale ?? "en") as Locale;
    const { subject: verifySubject, html: verifyHtml } =
      emailVerificationTemplate(verificationLink, locale);
    await nodemailerUtils({
      email: user.email,
      html: verifyHtml,
      subject: verifySubject,
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
      // Idempotent: a duplicate click on a still-valid link should not error.
      await userRepository.clearEmailVerificationToken(user._id.toString());
      return { message: AUTH_MESSAGES.EMAIL_VERIFICATION_SUCCESS };
    }

    await userRepository.markEmailVerified(user._id.toString());

    return {
      message: AUTH_MESSAGES.EMAIL_VERIFICATION_SUCCESS,
    };
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await userRepository.findByEmail(email);
    if (user && !user.verify_email) {
      await this.sendVerificationEmailToUser(user).catch((error) => {
        logger.error("Failed to resend verification email", {
          userId: user._id.toString(),
          email: user.email,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }

    return {
      message: AUTH_MESSAGES.EMAIL_VERIFICATION_SENT,
    };
  }

  /**
   * Accepts a Google ID token (JWT issued by Google to our client_id).
   * Replaces the previous access-token + userinfo flow, which couldn't
   * cryptographically verify token audience and didn't check email_verified.
   */
  async loginWithGoogle(idToken: string): Promise<AuthResponse> {
    if (!config.googleClientId) {
      throw new AppError(
        "Google login is not configured on this server",
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ErrorCode.INTERNAL_SERVER_ERROR
      );
    }

    let sub: string;
    let email: string;
    let emailVerified: boolean;
    let name: string | undefined;
    let picture: string | undefined;

    try {
      const ticket = await googleOAuthClient.verifyIdToken({
        idToken,
        audience: config.googleClientId,
      });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) {
        throw new Error("Missing required claims");
      }
      sub = payload.sub;
      email = payload.email;
      emailVerified = payload.email_verified === true;
      name = payload.name;
      picture = payload.picture;
    } catch {
      throw new AppError(
        AUTH_MESSAGES.TOKEN_INVALID,
        HTTP_STATUS.UNAUTHORIZED,
        ErrorCode.INVALID_TOKEN
      );
    }

    if (!emailVerified) {
      throw new AppError(
        AUTH_MESSAGES.EMAIL_NOT_VERIFIED,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.EMAIL_NOT_VERIFIED
      );
    }

    const user = await this.resolveGoogleUser({ sub, email, name, picture });

    if (user.status === UserStatus.BANNED) {
      throw new AppError(
        AUTH_MESSAGES.USER_BANNED,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.USER_BANNED
      );
    }

    if (user.status === UserStatus.DELETED) {
      throw new AppError(
        AUTH_MESSAGES.USER_DELETED,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.USER_DELETED
      );
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new AppError(
        AUTH_MESSAGES.USER_INACTIVE,
        HTTP_STATUS.FORBIDDEN,
        ErrorCode.USER_INACTIVE
      );
    }

    if (user.status === UserStatus.PENDING_DELETE) {
      await accountDeletionService.restoreOnLogin(user._id.toString());
      user.status = UserStatus.ACTIVE;
      user.deleted_at = null;
    }

    const { token, refreshToken } = await generateAuthTokens(user);

    return {
      user: toPublicUser(user),
      token,
      refreshToken,
    };
  }

  /**
   * Maps a verified Google identity to our user record. Handles the three
   * cases (already linked / link onto existing email / fresh signup) and is
   * race-safe: a unique sparse index on google_id means two concurrent calls
   * can't both insert; the duplicate-key loser retries the lookup.
   */
  private async resolveGoogleUser(claims: {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  }): Promise<IUserDocument> {
    const existingByGoogleId = await userRepository.findByGoogleId(claims.sub);
    if (existingByGoogleId) return existingByGoogleId;

    const existingByEmail = await userRepository.findByEmailWithGoogleId(
      claims.email
    );
    if (existingByEmail) {
      if (
        existingByEmail.google_id &&
        existingByEmail.google_id !== claims.sub
      ) {
        throw new AppError(
          AUTH_MESSAGES.INVALID_CREDENTIALS,
          HTTP_STATUS.UNAUTHORIZED,
          ErrorCode.INVALID_CREDENTIALS
        );
      }

      try {
        await userRepository.linkGoogleId(
          existingByEmail._id.toString(),
          claims.sub
        );
      } catch (err) {
        if (!this.isDuplicateKeyError(err)) {
          throw err;
        }

        const winner = await userRepository.findByGoogleId(claims.sub);
        if (winner) return winner;
        throw err;
      }
      return existingByEmail;
    }

    try {
      return await userRepository.createGoogleUser({
        email: claims.email,
        google_id: claims.sub,
        full_name: claims.name,
        avatar: claims.picture,
      });
    } catch (err) {
      // Concurrent request inserted first — re-fetch by either key.
      if (this.isDuplicateKeyError(err)) {
        const winner =
          (await userRepository.findByGoogleId(claims.sub)) ??
          (await userRepository.findByEmail(claims.email));
        if (winner) return winner;
      }
      throw err;
    }
  }

  private isDuplicateKeyError(err: unknown): boolean {
    return (
      typeof err === "object" &&
      err !== null &&
      (err as { code?: number }).code === 11000
    );
  }
}

export const authService = new AuthService();
