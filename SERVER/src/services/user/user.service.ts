import { Types } from "mongoose";

import { userRepository } from "../../repositories/auth/user.repository";
import { serviceRepository } from "../../repositories/service/service.repository";
import {
  workerServiceRepository,
  UpsertWorkerServicePayload,
} from "../../repositories/worker/worker-service.repository";
import { walletBalanceRepository } from "../../repositories/wallet/wallet-balance.repository";
import { workerPointWalletRepository } from "../../repositories/boost/worker-point-wallet.repository";
import { postRepository } from "../../repositories/post/post.repository";
import { commentRepository } from "../../repositories/comment/comment.repository";
import { Wallet } from "../../models/wallet/wallet.model";
import { WorkerPointWallet } from "../../models/boost/worker-point-wallet.model";
import { WorkerFavorite } from "../../models/worker/worker-favorite.model";
import { Reaction } from "../../models/reaction/reaction.model";
import { PushSubscription } from "../../models/notification/push-subscription.model";
import { NotificationPreference } from "../../models/notification/notification-preference.model";
import { WorkerBlackout } from "../../models/worker/worker-blackout.model";
import { GetUsersQuery } from "../../types/user/user.dto";
import { UserStatus, UserRole } from "../../types/auth/user.types";
import { AppError } from "../../utils/AppError";
import {
  USER_MESSAGES,
  AUTH_MESSAGES,
  COMMON_MESSAGES,
} from "../../constants/messages";
import { IUserDocument } from "../../types/auth/user.types";
import { hashPassword, comparePassword } from "../../utils/bcrypt";
import {
  UpdateBasicProfileSchemaType,
  UpdateWorkerProfileSchemaType,
} from "../../validations/user/user.validation";
import { AdminCreateUserSchemaType } from "../../validations/user/admin-create-user.validation";
import { AdminUpdateUserSchemaType } from "../../validations/user/admin-update-user.validation";
import { WorkerServicePricing } from "../../types/worker/worker-service";
import {
  DEFAULT_CURRENCY,
  getExchangeRate,
  isSupportedCurrency,
  toVnd,
} from "../../constants/currency";
import nodemailerUtils from "../../utils/nodemailer";
import { accountBannedTemplate } from "../../utils/template-mail";
import { APP_CONSTANTS } from "../../constants/app";
import { Locale } from "../../utils/i18n";
import { logger } from "../../utils/logger";
import { getSocketIO } from "../../config/socket";
import { getUserRoom } from "../../utils/chat.helper";
import { SOCKET_EVENTS } from "../../constants/socket";
import { getUserSocketIds } from "../../config/socket.handlers";
import { invalidateUserStatusCache } from "../../utils/userStatusCache";
import { normalizeAvatarUrl } from "../../utils/avatar-url";
import { normalizeHashtags } from "../../utils/worker-hashtag";
import { notificationEventService } from "../notification";

interface BecomeWorkerAuditContext {
  ip?: string;
  userAgent?: string;
}

export class UserService {
  async updateUserStatus(
    userId: string,
    status: UserStatus,
    audit: { adminId?: string; reason?: string } = {}
  ): Promise<void> {
    const existingUser = await userRepository.findById(userId);
    if (!existingUser) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    // PENDING_VERIFY / PENDING_DELETE / DELETED are lifecycle states owned by
    // the email-verification and account-deletion flows. Setting them straight
    // from the admin endpoint would skip the invariants those flows maintain
    // (e.g. a manual PENDING_DELETE never gets the `deleted_at` stamp the
    // cleanup cron keys off, stranding the row forever), so only allow the
    // statuses an admin legitimately toggles.
    if (
      ![UserStatus.ACTIVE, UserStatus.BANNED, UserStatus.INACTIVE].includes(
        status
      )
    ) {
      throw AppError.badRequest(USER_MESSAGES.INVALID_STATUS);
    }

    const user = await userRepository.updateStatus(userId, status);
    if (!user) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    // Drop the cached status so the next HTTP/socket auth check sees the
    // new value within the same request, not after the 30s TTL.
    invalidateUserStatusCache(userId);

    const becameBanned =
      status === UserStatus.BANNED && existingUser.status !== UserStatus.BANNED;
    const becameInactive =
      status === UserStatus.INACTIVE &&
      existingUser.status !== UserStatus.INACTIVE;
    const wasUnbanned =
      existingUser.status === UserStatus.BANNED && status === UserStatus.ACTIVE;

    // Both a ban and a deactivation must cut off live access: revoke the
    // refresh token (so no new access token can be minted) and drop every open
    // socket. Otherwise the current 15-minute access token would keep working.
    if (becameBanned || becameInactive) {
      // Revoke the refresh token so the client cannot mint a new access
      // token after their current one expires.
      await userRepository.clearRefreshToken(userId).catch((error) => {
        logger.warn("Failed to clear refresh token on status change", {
          error,
          userId,
          status,
        });
      });

      // Kick the user off every live socket. For a ban we emit the event first
      // so the client can show a friendly message before we force-close.
      try {
        const io = getSocketIO();
        if (becameBanned) {
          io.to(getUserRoom(userId)).emit(SOCKET_EVENTS.ACCOUNT_BANNED);
        }
        for (const socketId of getUserSocketIds(userId)) {
          io.sockets.sockets.get(socketId)?.disconnect(true);
        }
      } catch (error) {
        logger.warn(
          "Could not disconnect sockets on status change — socket may not be initialized",
          { error, userId, status }
        );
      }
    }

    if (becameInactive) {
      logger.info("AUDIT user deactivated", {
        event: "USER_DEACTIVATED",
        userId,
        adminId: audit.adminId,
        reason: audit.reason,
        previousStatus: existingUser.status,
      });
    }

    if (becameBanned) {
      logger.info("AUDIT user banned", {
        event: "USER_BANNED",
        userId,
        adminId: audit.adminId,
        reason: audit.reason,
        previousStatus: existingUser.status,
      });

      // In-app notification — durable record the user can see when they next
      // sign in (e.g. via a different device or after unban). Email is best-
      // effort and may be filtered to spam.
      if (audit.adminId) {
        void notificationEventService
          .accountBanned({
            userId,
            adminId: audit.adminId,
            reason: audit.reason,
          })
          .catch((error) => {
            logger.error("Failed to create account-banned notification", {
              error,
              userId,
            });
          });
      }

      await this.sendAccountBannedEmail(user).catch((error) => {
        logger.error("Failed to send account banned email", {
          error,
          userId,
          email: user.email,
        });
      });
    }

    if (wasUnbanned) {
      logger.info("AUDIT user unbanned", {
        event: "USER_UNBANNED",
        userId,
        adminId: audit.adminId,
      });
      if (audit.adminId) {
        void notificationEventService
          .accountUnbanned({ userId, adminId: audit.adminId })
          .catch((error) => {
            logger.error("Failed to create account-unbanned notification", {
              error,
              userId,
            });
          });
      }
    }
  }

  private async sendAccountBannedEmail(user: IUserDocument): Promise<void> {
    const locale = (user.meta_data?.locale ?? "en") as Locale;
    const { subject, html } = accountBannedTemplate(
      APP_CONSTANTS.ADMIN_CONTACT_EMAIL,
      user.full_name,
      locale
    );
    await nodemailerUtils({ email: user.email, html, subject });
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

  async updateLocale(userId: string, locale: string): Promise<IUserDocument> {
    const user = await userRepository.updateLocale(userId, locale);
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
      if (!userWithPassword) {
        throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);
      }

      if (userWithPassword.password_hash) {
        // Account already has a password → this is a change, so the current
        // password must be supplied and must match.
        if (!data.old_password) {
          throw AppError.badRequest(AUTH_MESSAGES.OLD_PASSWORD_REQUIRED);
        }
        const isOldPasswordValid = await comparePassword(
          data.old_password,
          userWithPassword.password_hash
        );
        if (!isOldPasswordValid) {
          throw AppError.badRequest(AUTH_MESSAGES.OLD_PASSWORD_INCORRECT);
        }
      }
      // Otherwise the account has no password yet (e.g. registered via Google):
      // allow setting the first password without an old password so the user can
      // also sign in with email/password.

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

  async completeOnboarding(userId: string): Promise<IUserDocument> {
    const user = await userRepository.setOnboardingDone(userId);
    if (!user) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);
    return user;
  }

  /**
   * Resolves the admin-supplied service codes into upsert payloads, validating
   * that each code maps to an active service and that no code is repeated. Done
   * up front (before the user is persisted) so a bad code fails the whole
   * request without leaving an orphan account behind.
   */
  private async resolveWorkerServices(
    services: NonNullable<AdminCreateUserSchemaType["worker_services"]>
  ): Promise<UpsertWorkerServicePayload[]> {
    const payloads: UpsertWorkerServicePayload[] = [];
    const seen = new Set<string>();

    for (const item of services) {
      const code = item.service_code.toUpperCase();
      if (seen.has(code)) {
        throw AppError.badRequest(COMMON_MESSAGES.BAD_REQUEST, [
          {
            field: "worker_services",
            message: `Duplicate service_code: ${code}`,
          },
        ]);
      }
      seen.add(code);

      const service = await serviceRepository.findByCode(code);
      if (!service || !service.is_active) {
        throw AppError.badRequest(COMMON_MESSAGES.BAD_REQUEST, [
          {
            field: "worker_services",
            message: `Service not found or inactive: ${code}`,
          },
        ]);
      }

      payloads.push({
        serviceId: service._id.toString(),
        serviceCode: service.code,
        pricing: item.pricing.map((p) => {
          const currency =
            p.currency && isSupportedCurrency(p.currency)
              ? p.currency
              : DEFAULT_CURRENCY;
          const price = Number(p.price);
          return {
            unit: p.unit,
            duration: p.duration,
            price,
            currency,
            exchange_rate: getExchangeRate(currency),
            price_vnd: toVnd(price, currency),
          };
        }),
        hashtags: normalizeHashtags(item.hashtags ?? []),
      });
    }

    return payloads;
  }

  /**
   * Admin-side user provisioning. Creates an already-verified, active account
   * (no email-verification handshake) and, when the worker role is requested,
   * provisions everything needed for the worker to show up and be bookable:
   * worker_profile + point wallet + service offerings. Every user also gets a
   * wallet.
   */
  async createUserByAdmin(
    input: AdminCreateUserSchemaType
  ): Promise<IUserDocument> {
    const email = input.email.toLowerCase().trim();

    if (await userRepository.emailExists(email)) {
      throw AppError.badRequest(AUTH_MESSAGES.EMAIL_EXISTS, [
        { field: "email", message: AUTH_MESSAGES.EMAIL_EXISTS },
      ]);
    }

    const isWorker = input.roles.includes(UserRole.WORKER);

    // A worker is always also a client, so they can switch back to the client
    // experience. last_active_role decides which UI they land in first.
    const roles = Array.from(
      new Set<UserRole>(
        isWorker ? [UserRole.CLIENT, UserRole.WORKER] : input.roles
      )
    );
    const lastActiveRole = isWorker ? UserRole.WORKER : UserRole.CLIENT;

    const workerServicePayloads = isWorker
      ? await this.resolveWorkerServices(input.worker_services!)
      : [];

    let workerProfile: Record<string, unknown> | null = null;
    if (isWorker && input.worker_profile) {
      // coords are not part of the user schema — drop them.
      const { coords: _coords, ...profileFields } = input.worker_profile;
      void _coords;
      workerProfile = profileFields;
    }

    const password_hash = await hashPassword(input.password);

    const user = await userRepository.createByAdmin({
      email,
      password_hash,
      full_name: input.full_name.trim(),
      phone: input.phone ?? null,
      avatar: input.avatar ?? null,
      roles,
      last_active_role: lastActiveRole,
      status: input.status,
      worker_profile: workerProfile,
    });

    const userId = user._id.toString();

    await walletBalanceRepository.createOrUpdate(userId, 0);

    if (isWorker) {
      await workerPointWalletRepository.findOrCreate(userId);
      await workerServiceRepository.upsertManyForWorker(
        userId,
        workerServicePayloads,
        new Date()
      );
    }

    logger.info("AUDIT admin created user", {
      event: "ADMIN_CREATE_USER",
      userId,
      email,
      roles,
      isWorker,
    });

    return user;
  }

  /**
   * Full account + worker offering for the admin edit form. Includes the
   * worker services (a separate collection) so the form can prefill pricing.
   */
  async getUserDetailForAdmin(userId: string): Promise<{
    user: IUserDocument;
    worker_services: Array<{
      service_code: string;
      pricing: WorkerServicePricing[];
      hashtags: string[];
    }>;
  }> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    const services = user.roles.includes(UserRole.WORKER)
      ? await workerServiceRepository.findAllForWorker(userId)
      : [];

    return {
      user,
      worker_services: services.map((s) => ({
        service_code: s.service_code,
        pricing: s.pricing,
        hashtags: s.hashtags ?? [],
      })),
    };
  }

  /**
   * Admin edit of an existing account. Mirrors createUserByAdmin but updates in
   * place: account fields, worker_profile and worker services are replaced;
   * password/email change only when provided. Any pre-existing ADMIN role is
   * preserved (the edit form only toggles client/worker).
   */
  async updateUserByAdmin(
    userId: string,
    input: AdminUpdateUserSchemaType
  ): Promise<IUserDocument> {
    const existing = await userRepository.findById(userId);
    if (!existing) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    // Only admin-provisioned accounts are editable; real users are read-only.
    if (!existing.created_by_admin) {
      throw AppError.forbidden(USER_MESSAGES.NOT_ADMIN_CREATED);
    }

    const newEmail = input.email?.toLowerCase().trim();
    if (newEmail && newEmail !== existing.email) {
      if (await userRepository.emailExists(newEmail)) {
        throw AppError.badRequest(AUTH_MESSAGES.EMAIL_EXISTS, [
          { field: "email", message: AUTH_MESSAGES.EMAIL_EXISTS },
        ]);
      }
    }

    const isWorker = input.roles.includes(UserRole.WORKER);
    const isAdmin = existing.roles.includes(UserRole.ADMIN);

    const roleSet = new Set<UserRole>(
      isWorker ? [UserRole.CLIENT, UserRole.WORKER] : [UserRole.CLIENT]
    );
    if (isAdmin) roleSet.add(UserRole.ADMIN);
    const roles = Array.from(roleSet);

    const lastActiveRole =
      existing.last_active_role === UserRole.ADMIN
        ? UserRole.ADMIN
        : isWorker
          ? UserRole.WORKER
          : UserRole.CLIENT;

    const workerServicePayloads = isWorker
      ? await this.resolveWorkerServices(input.worker_services!)
      : [];

    let workerProfile: Record<string, unknown> | null = null;
    if (isWorker && input.worker_profile) {
      const { coords: _coords, ...profileFields } = input.worker_profile;
      void _coords;
      workerProfile = profileFields;
    }

    const password_hash = input.password
      ? await hashPassword(input.password)
      : undefined;

    const user = await userRepository.updateByAdmin(userId, {
      email: newEmail,
      password_hash,
      full_name: input.full_name.trim(),
      phone: input.phone ?? null,
      avatar: input.avatar ?? null,
      roles,
      last_active_role: lastActiveRole,
      status: input.status,
      worker_profile: workerProfile,
    });
    if (!user) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    // Replace the worker service offerings so removed services disappear.
    await workerServiceRepository.deleteAllForWorker(userId);
    if (isWorker) {
      await workerPointWalletRepository.findOrCreate(userId);
      await workerServiceRepository.upsertManyForWorker(
        userId,
        workerServicePayloads,
        new Date()
      );
    }

    // Status may have changed — drop the cached status so auth checks see it.
    invalidateUserStatusCache(userId);

    logger.info("AUDIT admin updated user", {
      event: "ADMIN_UPDATE_USER",
      userId,
      roles,
      isWorker,
    });

    return user;
  }

  /**
   * Admin hard-delete of an admin-provisioned account. Real (self-registered)
   * users are never removed here — they go through the self-service soft-delete
   * flow. The account is removed unconditionally (even with an active balance,
   * bookings, or disputes). Cascade cleanup is best-effort (each step logs on
   * failure) before the user document is removed.
   */
  async deleteUserByAdmin(
    userId: string,
    audit: { adminId?: string } = {}
  ): Promise<void> {
    const existing = await userRepository.findById(userId);
    if (!existing) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    // Only admin-provisioned accounts can be hard-deleted from the admin panel.
    if (!existing.created_by_admin) {
      throw AppError.forbidden(USER_MESSAGES.NOT_ADMIN_CREATED);
    }

    const userObjectId = new Types.ObjectId(userId);

    // Cascade cleanup of data owned by / keyed to this user. Best-effort: each
    // step runs independently and a failure is logged but does not abort the
    // remaining cleanup or the final user removal.
    const results = await Promise.allSettled([
      Wallet.deleteMany({ user_id: userObjectId }),
      WorkerPointWallet.deleteMany({ user_id: userObjectId }),
      workerServiceRepository.deleteAllForWorker(userId),
      WorkerFavorite.deleteMany({
        $or: [{ client_id: userObjectId }, { worker_id: userObjectId }],
      }),
      Reaction.deleteMany({ user_id: userObjectId }),
      PushSubscription.deleteMany({ user_id: userObjectId }),
      NotificationPreference.deleteMany({ user_id: userObjectId }),
      WorkerBlackout.deleteMany({ worker_id: userObjectId }),
      postRepository.softDeleteAllByAuthor(userId),
      commentRepository.softDeleteAllByAuthor(userId),
    ]);

    results.forEach((r, idx) => {
      if (r.status === "rejected") {
        logger.error("Cascade step failed during admin user delete", {
          userId,
          step: idx,
          error: r.reason,
        });
      }
    });

    await userRepository.hardDeleteById(userId);

    // Drop the cached status and kick any live socket so the deleted account
    // loses realtime access immediately.
    invalidateUserStatusCache(userId);
    try {
      const io = getSocketIO();
      for (const socketId of getUserSocketIds(userId)) {
        io.sockets.sockets.get(socketId)?.disconnect(true);
      }
    } catch (error) {
      logger.warn(
        "Could not disconnect sockets on admin user delete — socket may not be initialized",
        { error, userId }
      );
    }

    logger.info("AUDIT admin deleted user", {
      event: "ADMIN_DELETE_USER",
      userId,
      email: existing.email,
      adminId: audit.adminId,
    });
  }
}

export const userService = new UserService();
