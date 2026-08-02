import { bookingRepository } from "../../repositories/booking/booking.repository";
import {
  BOOKING_LIMITS,
  BOOKING_AUTO_COMPLETE_STARTED_STATUSES,
  BookingStatus,
} from "../../constants/booking";
import { notificationEventService } from "../notification";
import { logger } from "../../utils/logger";
import { sendQuickBookingStatusEmail } from "./booking-email";
import { reputationService } from "../reputation/reputation.service";
import { reputationConfigService } from "../reputation/reputation-config.service";
import { ReputationConfigKey } from "../../types/reputation/reputation-config.types";
import { ReputationHistoryReason } from "../../types/reputation/reputation-history.types";

const HOUR_MS = 60 * 60 * 1000;
const AUTO_COMPLETE_SCAN_LIMIT = 100;

export interface BookingAutoCompleteResult {
  scanned_count: number;
  completed_count: number;
}

export class BookingAutoCompleteService {
  /**
   * Booking đã qua giờ kết thúc mà chưa ai bấm COMPLETED thì coi như xong: hai bên
   * làm xong ngoài đời rồi quên cập nhật. Không auto-complete thì worker không bao
   * giờ được review và số liệu completed luôn thiếu.
   *
   * Grace period khác nhau theo mức độ chắc chắn buổi hẹn đã diễn ra:
   * - IN_PROGRESS / PENDING_CLIENT_ACCEPTANCE: worker đã bấm bắt đầu → 2 giờ.
   * - CONFIRMED: không có tín hiệu nào, có thể worker no-show → 3 ngày, để hai bên
   *   kịp cancel trước khi hệ thống mặc định là đã hoàn thành.
   *
   * Sau khi auto-complete, client vẫn mở khiếu nại được trong DISPUTE_WINDOW_DAYS
   * tính từ completed_at (xem booking-dispute.service).
   */
  async completeFinishedBookings(
    now = new Date()
  ): Promise<BookingAutoCompleteResult> {
    const startedCutoff = new Date(
      now.getTime() - BOOKING_LIMITS.AUTO_COMPLETE_HOURS * HOUR_MS
    );
    const unstartedCutoff = new Date(
      now.getTime() - BOOKING_LIMITS.AUTO_COMPLETE_UNSTARTED_DAYS * 24 * HOUR_MS
    );

    const candidates =
      await bookingRepository.findFinishedBookingsForAutoComplete(
        startedCutoff,
        unstartedCutoff,
        AUTO_COMPLETE_SCAN_LIMIT
      );

    let completedCount = 0;

    for (const booking of candidates) {
      const wasStarted = BOOKING_AUTO_COMPLETE_STARTED_STATUSES.includes(
        booking.status as BookingStatus
      );

      const completed = await bookingRepository.autoCompleteBooking(
        booking._id.toString()
      );

      if (!completed) continue;

      completedCount += 1;

      const workerIdRaw = completed.worker_id as unknown as {
        _id?: unknown;
      };
      const workerId = String(workerIdRaw?._id ?? completed.worker_id);

      void reputationService
        .awardJobCompletion(workerId)
        .catch((error) =>
          logger.error(
            "Reputation bonus after auto-complete failed:",
            error
          )
        );

      // Only the "started" branch (worker had already begun the job) implies
      // they simply forgot to close it out — the "unstarted" 3-day branch has
      // no evidence the appointment happened at all, so it stays unpenalized.
      if (wasStarted) {
        void reputationConfigService
          .getActiveValue(ReputationConfigKey.LATE_COMPLETION_PENALTY)
          .then((points) => {
            if (points === null) return;
            return reputationService.deductPoints(
              workerId,
              points,
              ReputationHistoryReason.LATE_COMPLETION,
              0
            );
          })
          .catch((error) =>
            logger.error(
              "Reputation deduction after late completion failed:",
              error
            )
          );
      }

      void notificationEventService
        .bookingStatusUpdated(completed, BookingStatus.COMPLETED, null)
        .catch((error) =>
          logger.error("Booking auto-complete notification failed:", error)
        );

      void sendQuickBookingStatusEmail(
        completed,
        BookingStatus.COMPLETED
      ).catch((error) =>
        logger.error("Booking auto-complete email failed:", error)
      );
    }

    return {
      scanned_count: candidates.length,
      completed_count: completedCount,
    };
  }
}

export const bookingAutoCompleteService = new BookingAutoCompleteService();
