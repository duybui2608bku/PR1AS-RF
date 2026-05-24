import cron from "node-cron";
import { bookingExpirationService } from "../services/booking/booking-expiration.service";
import { withJobLock } from "../utils/job-lock";
import { logger } from "../utils/logger";

const BOOKING_EXPIRATION_CRON = "*/5 * * * *";
const JOB_NAME = "booking-expiration";
// Lock TTL must outlive a normal run but be short enough that a crashed
// instance does not block subsequent ticks indefinitely. 4 minutes leaves
// room before the next 5-minute tick attempts to reclaim a stale lock.
const JOB_LOCK_TTL_MS = 4 * 60 * 1000;

let bookingExpirationTask: ReturnType<typeof cron.schedule> | null = null;

export function startBookingExpirationJob(): void {
  if (bookingExpirationTask) return;

  bookingExpirationTask = cron.schedule(BOOKING_EXPIRATION_CRON, async () => {
    try {
      const result = await withJobLock(
        JOB_NAME,
        { ttlMs: JOB_LOCK_TTL_MS },
        () => bookingExpirationService.expireUnconfirmedBookings()
      );

      if (result && result.expired_count > 0) {
        logger.info("Expired unconfirmed bookings", result);
      }
    } catch (error) {
      logger.error("Booking expiration job failed:", error);
    }
  });

  logger.info(
    `Booking expiration job scheduled with cron "${BOOKING_EXPIRATION_CRON}"`
  );
}

export function stopBookingExpirationJob(): void {
  if (!bookingExpirationTask) return;

  bookingExpirationTask.stop();
  bookingExpirationTask = null;
  logger.info("Booking expiration job stopped");
}
