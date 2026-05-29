import cron from "node-cron";
import { bookingRepository } from "../repositories/booking";
import { notificationEventService } from "../services/notification";
import { withJobLock } from "../utils/job-lock";
import { logger } from "../utils/logger";

const BOOKING_REMINDER_CRON = "*/10 * * * *";
const JOB_NAME = "booking-reminder";
const JOB_LOCK_TTL_MS = 5 * 60 * 1000;

let bookingReminderTask: ReturnType<typeof cron.schedule> | null = null;

export function startBookingReminderJob(): void {
  if (bookingReminderTask) return;

  bookingReminderTask = cron.schedule(BOOKING_REMINDER_CRON, async () => {
    try {
      await withJobLock(JOB_NAME, { ttlMs: JOB_LOCK_TTL_MS }, async () => {
        const now = new Date();
        const [dayBookings, hourBookings] = await Promise.all([
          bookingRepository.findUpcomingBookingsForReminder(now, 24),
          bookingRepository.findUpcomingBookingsForReminder(now, 1),
        ]);

        await Promise.all([
          ...dayBookings.map((booking) =>
            notificationEventService.bookingReminder(booking, 24)
          ),
          ...hourBookings.map((booking) =>
            notificationEventService.bookingReminder(booking, 1)
          ),
        ]);
      });
    } catch (error) {
      logger.error("Booking reminder job failed:", error);
    }
  });

  logger.info(
    `Booking reminder job scheduled with cron "${BOOKING_REMINDER_CRON}"`
  );
}

export function stopBookingReminderJob(): void {
  if (!bookingReminderTask) return;
  bookingReminderTask.stop();
  bookingReminderTask = null;
  logger.info("Booking reminder job stopped");
}
