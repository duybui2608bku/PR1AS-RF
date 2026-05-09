import cron from "node-cron";
import { bookingExpirationService } from "../services/booking/booking-expiration.service";
import { logger } from "../utils/logger";

const BOOKING_EXPIRATION_CRON = "*/5 * * * *";

let bookingExpirationTask: ReturnType<typeof cron.schedule> | null = null;
let isBookingExpirationRunning = false;

export function startBookingExpirationJob(): void {
  if (bookingExpirationTask) return;

  bookingExpirationTask = cron.schedule(BOOKING_EXPIRATION_CRON, async () => {
    if (isBookingExpirationRunning) return;

    isBookingExpirationRunning = true;

    try {
      const result =
        await bookingExpirationService.expireUnconfirmedBookings();

      if (result.expired_count > 0) {
        logger.info("Expired unconfirmed bookings", result);
      }
    } catch (error) {
      logger.error("Booking expiration job failed:", error);
    } finally {
      isBookingExpirationRunning = false;
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
