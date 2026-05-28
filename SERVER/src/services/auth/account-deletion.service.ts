import { Types } from "mongoose";
import { userRepository } from "../../repositories/auth/user.repository";
import { walletBalanceRepository } from "../../repositories/wallet/wallet-balance.repository";
import { bookingRepository } from "../../repositories/booking/booking.repository";
import { postRepository } from "../../repositories/post/post.repository";
import { commentRepository } from "../../repositories/comment/comment.repository";
import { Reaction } from "../../models/reaction/reaction.model";
import { WorkerFavorite } from "../../models/worker/worker-favorite.model";
import { PushSubscription } from "../../models/notification/push-subscription.model";
import { NotificationPreference } from "../../models/notification/notification-preference.model";
import { WorkerService } from "../../models/worker/worker-service";
import { WorkerBlackout } from "../../models/worker/worker-blackout.model";
import { comparePassword } from "../../utils/bcrypt";
import { AppError } from "../../utils/AppError";
import { ErrorCode } from "../../types/common/error.types";
import { HTTP_STATUS } from "../../constants/httpStatus";
import { AUTH_MESSAGES, USER_MESSAGES } from "../../constants/messages";
import { UserStatus } from "../../types/auth/user.types";
import { logger } from "../../utils/logger";
import { getSocketIO } from "../../config/socket";
import { getUserRoom } from "../../utils/chat.helper";
import { SOCKET_EVENTS } from "../../constants/socket";
import { getUserSocketIds } from "../../config/socket.handlers";
import { invalidateUserStatusCache } from "../../utils/userStatusCache";

// Window between PENDING_DELETE and the irreversible scrub. The user can log
// in any time before this elapses to cancel the deletion.
export const DELETION_GRACE_DAYS = 30;
const DELETION_GRACE_MS = DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000;

export interface DeletionBlocker {
  code:
    | "WALLET_BALANCE"
    | "ACTIVE_BOOKINGS"
    | "OPEN_DISPUTES";
  detail: number;
}

export interface DeletionGateResult {
  ok: boolean;
  blockers: DeletionBlocker[];
}

export interface DeletionRequestResult {
  status: UserStatus;
  deleted_at: Date;
  restore_until: Date;
}

export interface DeletionStatusResult {
  has_password: boolean;
  has_google: boolean;
  blockers: DeletionBlocker[];
}

export class AccountDeletionService {
  /**
   * Whether the account is in a state where outstanding obligations would be
   * lost or stranded by a deletion. Returns the full blocker list so the UI
   * can guide the user toward resolving each one.
   */
  async canDeleteAccount(userId: string): Promise<DeletionGateResult> {
    const [wallet, activeBookings, openDisputes] = await Promise.all([
      walletBalanceRepository.findByUserId(userId),
      bookingRepository.countActiveBookingsForUser(userId),
      bookingRepository.countOpenDisputesForUser(userId),
    ]);

    const blockers: DeletionBlocker[] = [];
    const balance = wallet?.balance ?? 0;
    if (balance > 0) {
      blockers.push({ code: "WALLET_BALANCE", detail: balance });
    }
    if (activeBookings > 0) {
      blockers.push({ code: "ACTIVE_BOOKINGS", detail: activeBookings });
    }
    if (openDisputes > 0) {
      blockers.push({ code: "OPEN_DISPUTES", detail: openDisputes });
    }

    return { ok: blockers.length === 0, blockers };
  }

  /**
   * Pre-check called by the client before opening the delete-confirm dialog.
   * Tells the UI whether the user can submit a password (Google-only accounts
   * must reset their password first) and surfaces blockers up front so the
   * user doesn't have to submit just to learn what's wrong.
   */
  async getDeletionStatus(userId: string): Promise<DeletionStatusResult> {
    const [authMethods, gate] = await Promise.all([
      userRepository.getAuthMethodsById(userId),
      this.canDeleteAccount(userId),
    ]);
    if (!authMethods) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);
    return {
      has_password: authMethods.has_password,
      has_google: authMethods.has_google,
      blockers: gate.blockers,
    };
  }

  /**
   * Transition ACTIVE → PENDING_DELETE. Validates the user's password (no
   * Google-only accounts can self-delete — they go through restore-via-login
   * instead), runs the gate, clears refresh tokens, drops every socket, and
   * caches the new status so the next request sees it immediately.
   */
  async requestDeletion(
    userId: string,
    password: string
  ): Promise<DeletionRequestResult> {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) throw AppError.notFound(USER_MESSAGES.USER_NOT_FOUND);

    if (user.status !== UserStatus.ACTIVE) {
      // Already pending / deleted / banned — re-issuing the request is a no-op
      // we'd rather surface than silently confirm.
      throw new AppError(
        AUTH_MESSAGES.ACCOUNT_DELETE_BLOCKED,
        HTTP_STATUS.CONFLICT,
        ErrorCode.ACCOUNT_DELETE_BLOCKED
      );
    }

    if (!user.password_hash) {
      // Google-only signup with no password set. The OAuth provider is the
      // authenticator, but we still need a high-friction confirmation before
      // destroying data — require they set a password via reset flow first.
      throw new AppError(
        AUTH_MESSAGES.OLD_PASSWORD_INCORRECT,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.INVALID_CREDENTIALS
      );
    }

    const ok = await comparePassword(password, user.password_hash);
    if (!ok) {
      throw new AppError(
        AUTH_MESSAGES.OLD_PASSWORD_INCORRECT,
        HTTP_STATUS.BAD_REQUEST,
        ErrorCode.INVALID_CREDENTIALS
      );
    }

    const gate = await this.canDeleteAccount(userId);
    if (!gate.ok) {
      const err = new AppError(
        AUTH_MESSAGES.ACCOUNT_DELETE_BLOCKED,
        HTTP_STATUS.CONFLICT,
        ErrorCode.ACCOUNT_DELETE_BLOCKED,
        gate.blockers.map((b) => ({ field: b.code, message: String(b.detail) }))
      );
      throw err;
    }

    const updated = await userRepository.markPendingDelete(userId);
    if (!updated) {
      // Lost the race — another request flipped status concurrently. Treat as
      // already-pending to keep the API idempotent.
      throw new AppError(
        AUTH_MESSAGES.ACCOUNT_DELETE_BLOCKED,
        HTTP_STATUS.CONFLICT,
        ErrorCode.ACCOUNT_DELETE_BLOCKED
      );
    }

    invalidateUserStatusCache(userId);
    this.kickAllSockets(userId, SOCKET_EVENTS.ACCOUNT_BANNED);

    const deletedAt = updated.deleted_at ?? new Date();
    return {
      status: updated.status,
      deleted_at: deletedAt,
      restore_until: new Date(deletedAt.getTime() + DELETION_GRACE_MS),
    };
  }

  /**
   * Called by the login flow when a PENDING_DELETE user successfully
   * authenticates. Restores them to ACTIVE atomically.
   */
  async restoreOnLogin(userId: string): Promise<void> {
    const restored = await userRepository.restoreFromPendingDelete(userId);
    if (restored) {
      invalidateUserStatusCache(userId);
      logger.info(`Restored PENDING_DELETE user on login`, { userId });
    }
  }

  /**
   * Final scrub. Idempotent at the User level (the findOneAndUpdate filters by
   * PENDING_DELETE so a concurrent run no-ops), but cascade ops are best-effort
   * — each runs independently and logs on failure.
   */
  async scrubAndCascade(userId: string): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);

    const scrubbed = await userRepository.scrubAndMarkDeleted(userId);
    if (!scrubbed) {
      logger.warn("Scrub skipped — user not in PENDING_DELETE", { userId });
      return;
    }

    invalidateUserStatusCache(userId);

    const results = await Promise.allSettled([
      postRepository.softDeleteAllByAuthor(userId),
      commentRepository.softDeleteAllByAuthor(userId),
      Reaction.deleteMany({ user_id: userObjectId }),
      WorkerFavorite.deleteMany({
        $or: [{ client_id: userObjectId }, { worker_id: userObjectId }],
      }),
      PushSubscription.deleteMany({ user_id: userObjectId }),
      NotificationPreference.deleteMany({ user_id: userObjectId }),
      WorkerService.updateMany(
        { worker_id: userObjectId },
        { is_active: false }
      ),
      WorkerBlackout.deleteMany({ worker_id: userObjectId }),
    ]);

    results.forEach((r, idx) => {
      if (r.status === "rejected") {
        logger.error("Cascade step failed during account scrub", {
          userId,
          step: idx,
          error: r.reason,
        });
      }
    });

    logger.info("Account scrubbed and cascaded", { userId });
  }

  /**
   * Disconnect every active socket of the user and (best-effort) notify the
   * client. Reused for ban and pending-delete because both require yanking
   * realtime access immediately.
   */
  private kickAllSockets(userId: string, eventName: string): void {
    try {
      const io = getSocketIO();
      io.to(getUserRoom(userId)).emit(eventName);
      for (const socketId of getUserSocketIds(userId)) {
        io.sockets.sockets.get(socketId)?.disconnect(true);
      }
    } catch (error) {
      logger.warn("Could not disconnect sockets — socket may not be initialized", {
        error,
        userId,
      });
    }
  }
}

export const accountDeletionService = new AccountDeletionService();
