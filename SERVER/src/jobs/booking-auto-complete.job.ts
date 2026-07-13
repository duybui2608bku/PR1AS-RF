import cron from "node-cron";
import { bookingAutoCompleteService } from "../services/booking/booking-auto-complete.service";
import { withJobLock } from "../utils/job-lock";
import { logger } from "../utils/logger";

const BOOKING_AUTO_COMPLETE_CRON = "*/15 * * * *";
const JOB_NAME = "booking-auto-complete";
const JOB_LOCK_TTL_MS = 10 * 60 * 1000;

let bookingAutoCompleteTask: ReturnType<typeof cron.schedule> | null = null;

export function startBookingAutoCompleteJob(): void {
  if (bookingAutoCompleteTask) return;

  bookingAutoCompleteTask = cron.schedule(
    BOOKING_AUTO_COMPLETE_CRON,
    async () => {
      try {
        const result = await withJobLock(
          JOB_NAME,
          { ttlMs: JOB_LOCK_TTL_MS },
          () => bookingAutoCompleteService.completeFinishedBookings()
        );

        if (result && result.completed_count > 0) {
          logger.info("Auto-completed finished bookings", result);
        }
      } catch (error) {
        logger.error("Booking auto-complete job failed:", error);
      }
    }
  );

  logger.info(
    `Booking auto-complete job scheduled with cron "${BOOKING_AUTO_COMPLETE_CRON}"`
  );
}

export function stopBookingAutoCompleteJob(): void {
  if (!bookingAutoCompleteTask) return;

  bookingAutoCompleteTask.stop();
  bookingAutoCompleteTask = null;
  logger.info("Booking auto-complete job stopped");
}
