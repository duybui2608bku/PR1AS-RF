import { bookingRepository } from "../../repositories/booking/booking.repository";
import { BOOKING_LIMITS, BookingStatus } from "../../constants/booking";
import { notificationEventService } from "../notification";
import { logger } from "../../utils/logger";
import { sendQuickBookingStatusEmail } from "./booking-email";

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
      const completed = await bookingRepository.autoCompleteBooking(
        booking._id.toString()
      );

      if (!completed) continue;

      completedCount += 1;

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
