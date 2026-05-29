import { AppError } from "./AppError";
import { AUTH_MESSAGES } from "../constants/messages";
import { ErrorCode } from "../types/common/error.types";
import { UserStatus } from "../types/auth/user.types";

/**
 * Maps a (possibly missing) account status to the error that should be raised
 * when a non-ACTIVE user tries to act, or `null` when the account is ACTIVE and
 * the request may proceed. A missing status (`null`) — bogus id or a row that
 * no longer exists — is treated as DELETED.
 *
 * Centralised so the HTTP `authenticate`/`enforceFreshStatus` middleware, the
 * Socket.IO handshake and service-layer guards all reject the same way and stay
 * in lockstep as new statuses are added to {@link UserStatus}.
 */
export const accountStatusError = (
  status: UserStatus | null
): AppError | null => {
  switch (status) {
    case UserStatus.ACTIVE:
      return null;
    case UserStatus.PENDING_VERIFY:
      return AppError.forbidden(
        AUTH_MESSAGES.EMAIL_NOT_VERIFIED,
        ErrorCode.EMAIL_NOT_VERIFIED
      );
    case UserStatus.INACTIVE:
      return AppError.forbidden(
        AUTH_MESSAGES.USER_INACTIVE,
        ErrorCode.USER_INACTIVE
      );
    case UserStatus.BANNED:
      return AppError.forbidden(
        AUTH_MESSAGES.USER_BANNED,
        ErrorCode.USER_BANNED
      );
    case UserStatus.PENDING_DELETE:
      return AppError.forbidden(
        AUTH_MESSAGES.USER_PENDING_DELETE,
        ErrorCode.USER_PENDING_DELETE
      );
    case UserStatus.DELETED:
    default:
      return AppError.forbidden(
        AUTH_MESSAGES.USER_DELETED,
        ErrorCode.USER_DELETED
      );
  }
};
