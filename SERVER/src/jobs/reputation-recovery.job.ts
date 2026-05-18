import cron from "node-cron";
import { reputationService } from "../services/reputation/reputation.service";
import { logger } from "../utils/logger";

// Run at 00:00 every day
const REPUTATION_RECOVERY_CRON = "0 0 * * *";

let reputationRecoveryTask: ReturnType<typeof cron.schedule> | null = null;
let isReputationRecoveryRunning = false;

export function startReputationRecoveryJob(): void {
  if (reputationRecoveryTask) return;

  reputationRecoveryTask = cron.schedule(REPUTATION_RECOVERY_CRON, async () => {
    if (isReputationRecoveryRunning) return;

    isReputationRecoveryRunning = true;

    try {
      const count = await reputationService.bulkDailyRecovery();
      if (count > 0) {
        logger.info(`Reputation recovery: daily points applied to ${count} users`);
      }
    } catch (error) {
      logger.error("Reputation recovery job failed:", error);
    } finally {
      isReputationRecoveryRunning = false;
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
