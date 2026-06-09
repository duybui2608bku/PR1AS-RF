import { bookingRepository } from "../../repositories/booking/booking.repository";
import { BOOKING_LIMITS, BookingStatus } from "../../constants/booking";
import { notificationEventService } from "../notification";
import { reputationService } from "../reputation/reputation.service";
import { reputationConfigService } from "../reputation/reputation-config.service";
import { ReputationConfigKey } from "../../types/reputation/reputation-config.types";
import { ReputationHistoryReason } from "../../types/reputation/reputation-history.types";
import { logger } from "../../utils/logger";
import type { IBookingDocument } from "../../types/booking";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const EXPIRATION_SCAN_LIMIT = 100;

type BookingExpirationReason =
  | "short_notice_confirmation_timeout"
  | "confirmation_deadline_before_start";

export interface BookingExpirationResult {
  scanned_count: number;
  expired_count: number;
}

export interface BookingConfirmationDeadline {
  deadline: Date;
  reason: BookingExpirationReason;
}

export class BookingExpirationService {
  getConfirmationDeadline(
    booking: IBookingDocument
  ): BookingConfirmationDeadline {
    const createdAt = booking.created_at;
    const startTime = booking.schedule.start_time;
    const beforeStartDeadline = new Date(
      startTime.getTime() -
        BOOKING_LIMITS.CONFIRM_DEADLINE_BEFORE_START_HOURS * HOUR_MS
    );

    if (beforeStartDeadline <= createdAt) {
      return {
        deadline: new Date(
          createdAt.getTime() +
            BOOKING_LIMITS.SHORT_NOTICE_CONFIRM_MINUTES * MINUTE_MS
        ),
        reason: "short_notice_confirmation_timeout",
      };
    }

    return {
      deadline: beforeStartDeadline,
      reason: "confirmation_deadline_before_start",
    };
  }

  async expireUnconfirmedBookings(
    now = new Date()
  ): Promise<BookingExpirationResult> {
    const candidates =
      await bookingRepository.findPendingBookingsForExpirationScan(
        now,
        BOOKING_LIMITS.SHORT_NOTICE_CONFIRM_MINUTES,
        BOOKING_LIMITS.CONFIRM_DEADLINE_BEFORE_START_HOURS,
        EXPIRATION_SCAN_LIMIT
      );

    let expiredCount = 0;

    for (const booking of candidates) {
      if (booking.status !== BookingStatus.PENDING) continue;

      const { deadline, reason } = this.getConfirmationDeadline(booking);
      if (deadline > now) continue;

      const expiredBooking = await bookingRepository.expirePendingBooking(
        booking._id.toString()
      );

      if (!expiredBooking) continue;

      expiredCount += 1;

      void notificationEventService
        .bookingAutoExpiredWarning(expiredBooking, { deadline, reason })
        .catch((error) =>
          logger.error("Booking expiration notification failed:", error)
        );

      const workerId = expiredBooking.worker_id.toString();
      void reputationConfigService
        .getActiveValue(ReputationConfigKey.BOOKING_EXPIRY_DEDUCTION)
        .then((points) => {
          if (points === null) return;
          return reputationService.deductPoints(
            workerId,
            points,
            ReputationHistoryReason.BOOKING_EXPIRY
          );
        })
        .catch((err) => logger.error("Reputation deduction after booking expiry failed:", err));
    }

    return {
      scanned_count: candidates.length,
      expired_count: expiredCount,
    };
  }
}

export const bookingExpirationService = new BookingExpirationService();
