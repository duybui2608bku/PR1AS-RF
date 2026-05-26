import cron from "node-cron";
import { userRepository } from "../repositories/auth/user.repository";
import {
  accountDeletionService,
  DELETION_GRACE_DAYS,
} from "../services/auth/account-deletion.service";
import { withJobLock } from "../utils/job-lock";
import { logger } from "../utils/logger";

// Daily at 03:15 — off-peak, and offset from other jobs (bookings, plans)
// that already cluster around the hour boundary.
const ACCOUNT_DELETION_CRON = "15 3 * * *";
const JOB_NAME = "account-deletion-scrub";
const JOB_LOCK_TTL_MS = 30 * 60 * 1000;
const GRACE_MS = DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000;

let task: ReturnType<typeof cron.schedule> | null = null;

export function startAccountDeletionJob(): void {
  if (task) return;

  task = cron.schedule(ACCOUNT_DELETION_CRON, async () => {
    try {
      await withJobLock(JOB_NAME, { ttlMs: JOB_LOCK_TTL_MS }, async () => {
        const cutoff = new Date(Date.now() - GRACE_MS);
        const expired = await userRepository.findPendingDeleteExpired(cutoff);
        if (expired.length === 0) return;

        logger.info(
          `Scrubbing ${expired.length} PENDING_DELETE users past grace window`
        );

        for (const user of expired) {
          try {
            await accountDeletionService.scrubAndCascade(user._id.toString());
          } catch (error) {
            logger.error("Failed to scrub account", {
              userId: user._id.toString(),
              error,
            });
          }
        }
      });
    } catch (error) {
      logger.error("Account deletion job failed:", error);
    }
  });

  logger.info(
    `Account deletion job scheduled with cron "${ACCOUNT_DELETION_CRON}"`
  );
}

export function stopAccountDeletionJob(): void {
  if (!task) return;
  task.stop();
  task = null;
  logger.info("Account deletion job stopped");
}
