import cron from "node-cron";
import { reputationService } from "../services/reputation/reputation.service";
import { withJobLock } from "../utils/job-lock";
import { logger } from "../utils/logger";

const REPUTATION_RECOVERY_CRON = "0 0 * * *";
const JOB_NAME = "reputation-recovery";
const JOB_LOCK_TTL_MS = 10 * 60 * 1000;

let reputationRecoveryTask: ReturnType<typeof cron.schedule> | null = null;

export function startReputationRecoveryJob(): void {
  if (reputationRecoveryTask) return;

  reputationRecoveryTask = cron.schedule(REPUTATION_RECOVERY_CRON, async () => {
    try {
      const count = await withJobLock(
        JOB_NAME,
        { ttlMs: JOB_LOCK_TTL_MS },
        () => reputationService.bulkDailyRecovery()
      );
      if (typeof count === "number" && count > 0) {
        logger.info(
          `Reputation recovery: daily points applied to ${count} users`
        );
      }
    } catch (error) {
      logger.error("Reputation recovery job failed:", error);
    }
  });

  logger.info(
    `Reputation recovery job scheduled with cron "${REPUTATION_RECOVERY_CRON}"`
  );
}

export function stopReputationRecoveryJob(): void {
  if (!reputationRecoveryTask) return;

  reputationRecoveryTask.stop();
  reputationRecoveryTask = null;
  logger.info("Reputation recovery job stopped");
}
