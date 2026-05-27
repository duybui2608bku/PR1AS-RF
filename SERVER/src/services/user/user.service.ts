import { userRepository } from "../../repositories/auth/user.repository";
import { GetUsersQuery } from "../../types/user/user.dto";
import { UserStatus, UserRole } from "../../types/auth/user.types";
import { AppError } from "../../utils/AppError";
import { USER_MESSAGES, AUTH_MESSAGES } from "../../constants/messages";
import { IUserDocument } from "../../types/auth/user.types";
import { hashPassword, comparePassword } from "../../utils/bcrypt";
import {
  UpdateBasicProfileSchemaType,
  UpdateWorkerProfileSchemaType,
} from "../../validations/user/user.validation";
import nodemailerUtils from "../../utils/nodemailer";
import { accountBannedTemplate } from "../../utils/template-mail";
import { APP_CONSTANTS, EMAIL_SUBJECTS } from "../../constants/app";
import { logger } from "../../utils/logger";
import { getSocketIO } from "../../config/socket";
import { getUserRoom } from "../../utils/chat.helper";
import { SOCKET_EVENTS } from "../../constants/socket";
import { getUserSocketIds } from "../../config/socket.handlers";
import { invalidateUserStatusCache } from "../../utils/userStatusCache";
import { normalizeAvatarUrl } from "../../utils/avatar-url";

interface BecomeWorkerAuditContext {
  ip?: string;
  userAgent?: string;
}

export class UserService {
  async updateUserStatus(userId: string, status: UserStatus): Promise<void> {
    const existingUser = await userRepository.findById(userId);
    if (!existingUser) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    const user = await userRepository.updateStatus(userId, status);
    if (!user) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    // Drop the cached status so the next HTTP/socket auth check sees the
    // new value within the same request, not after the 30s TTL.
    invalidateUserStatusCache(userId);

    if (
      status === UserStatus.BANNED &&
      existingUser.status !== UserStatus.BANNED
    ) {
      // Revoke the refresh token so the client cannot mint a new access
      // token after their current one expires.
      await userRepository.clearRefreshToken(userId).catch((error) => {
        logger.warn("Failed to clear refresh token on ban", { error, userId });
      });

      // Kick the user off every live socket. Emitting the event first lets
      // the client show a friendly "your account was banned" message before
      // we force-close the connection.
      try {
        const io = getSocketIO();
        io.to(getUserRoom(userId)).emit(SOCKET_EVENTS.ACCOUNT_BANNED);
        for (const socketId of getUserSocketIds(userId)) {
          io.sockets.sockets.get(socketId)?.disconnect(true);
        }
      } catch (error) {
        logger.warn(
          "Could not disconnect sockets on ban — socket may not be initialized",
          { error, userId }
        );
      }

      await this.sendAccountBannedEmail(user).catch((error) => {
        logger.error("Failed to send account banned email", {
          error,
          userId,
          email: user.email,
        });
      });
    }
  }

  private async sendAccountBannedEmail(user: IUserDocument): Promise<void> {
    await nodemailerUtils({
      email: user.email,
      html: accountBannedTemplate(
        APP_CONSTANTS.ADMIN_CONTACT_EMAIL,
        user.full_name
      ),
      subject: EMAIL_SUBJECTS.ACCOUNT_BANNED,
    });
  }

  async updateLastActiveRole(
    userId: string,
    last_active_role: UserRole
  ): Promise<IUserDocument> {
    // Only fetch roles — no need for the full document
    const roles = await userRepository.findRolesById(userId);
    if (!roles) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    if (!roles.includes(last_active_role)) {
      throw AppError.badRequest(
        `User does not have ${last_active_role} role. Please add this role first.`
      );
    }

    const user = await userRepository.updateLastActiveRole(
      userId,
      last_active_role
    );
    if (!user) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    return user;
  }

  async getAllUsers(
    query: GetUsersQuery & { skip: number }
  ): Promise<{ users: IUserDocument[]; total: number }> {
    return userRepository.findAllWithFilters(query);
  }

  private splitWorkerProfileInput(
    input: UpdateWorkerProfileSchemaType["worker_profile"]
  ): {
    coords?: { latitude: number | null; longitude: number | null };
    profileFields: Record<string, unknown>;
  } {
    // coords are stored at root level, not inside worker_profile subdocument.
    const { coords, ...profileFields } = input;
    return {
      coords: coords ?? undefined,
      profileFields: profileFields as Record<string, unknown>,
    };
  }

  async updateWorkerProfile(
    userId: string,
    input: UpdateWorkerProfileSchemaType["worker_profile"]
  ): Promise<IUserDocument> {
    const currentUser = await userRepository.findById(userId); // DB call 1
    if (!currentUser) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    if (!currentUser.roles.includes(UserRole.WORKER)) {
      throw AppError.forbidden(USER_MESSAGES.WORKER_ROLE_REQUIRED);
    }

    const { coords, profileFields } = this.splitWorkerProfileInput(input);

    const user = await userRepository.updateWorkerProfile(
      // DB call 2 (compound atomic)
      userId,
      profileFields,
      { coords }
    );

    if (!user) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);
    return user;
  }

  async becomeWorker(
    userId: string,
    input: UpdateWorkerProfileSchemaType["worker_profile"],
    auditContext: BecomeWorkerAuditContext = {}
  ): Promise<IUserDocument> {
    const currentUser = await userRepository.findById(userId);
    if (!currentUser) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    const alreadyWorker = currentUser.roles.includes(UserRole.WORKER);
    const { coords, profileFields } = this.splitWorkerProfileInput(input);

    const user = await userRepository.updateWorkerProfile(
      userId,
      profileFields,
      {
        coords,
        addWorkerRole: !alreadyWorker,
        setLastActiveRole: UserRole.WORKER,
      }
    );

    if (!user) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    logger.info("AUDIT user become worker confirmed", {
      event: "USER_BECOME_WORKER_CONFIRMED",
      userId,
      alreadyWorker,
      previousRoles: currentUser.roles,
      previousLastActiveRole: currentUser.last_active_role,
      ip: auditContext.ip,
      userAgent: auditContext.userAgent,
    });

    return user;
  }

  async updateBasicProfile(
    userId: string,
    data: UpdateBasicProfileSchemaType
  ): Promise<IUserDocument> {
    let password_hash: string | undefined;
    let avatar: string | null | undefined;

    if (data.avatar !== undefined) {
      avatar = data.avatar === null ? null : normalizeAvatarUrl(data.avatar);
      if (data.avatar !== null && !avatar) {
        throw AppError.badRequest(USER_MESSAGES.INVALID_AVATAR_URL, [
          { field: "avatar", message: USER_MESSAGES.INVALID_AVATAR_URL },
        ]);
      }
    }

    if (data.password) {
      // Single DB call: get user with password_hash for verification
      const userWithPassword =
        await userRepository.findByIdWithPassword(userId);
      if (!userWithPassword || !userWithPassword.password_hash) {
        throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);
      }

      const isOldPasswordValid = await comparePassword(
        data.old_password!,
        userWithPassword.password_hash
      );

      if (!isOldPasswordValid) {
        throw AppError.badRequest(AUTH_MESSAGES.OLD_PASSWORD_INCORRECT);
      }

      password_hash = await hashPassword(data.password);
    }

    const updatedUser = await userRepository.updateBasicProfile(userId, {
      password_hash,
      avatar,
      full_name: data.full_name,
      phone: data.phone,
    });

    if (!updatedUser) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    // Invalidate every active refresh token after a password change so that
    // any stolen sessions can no longer mint new access tokens. The caller's
    // current access token continues to work until it expires (≤15 min).
    if (password_hash) {
      await userRepository.clearRefreshToken(userId);
    }

    return updatedUser;
  }
}

export const userService = new UserService();
