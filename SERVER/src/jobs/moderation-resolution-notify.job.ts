import cron from "node-cron";
import { moderationService } from "../services/moderation";
import { withJobLock } from "../utils/job-lock";
import { logger } from "../utils/logger";

const MODERATION_RESOLUTION_CRON = "*/30 * * * * *";
const JOB_NAME = "moderation-resolution-notify";
const JOB_LOCK_TTL_MS = 60 * 1000;

let moderationResolutionTask: ReturnType<typeof cron.schedule> | null = null;

export function startModerationResolutionJob(): void {
  if (moderationResolutionTask) return;

  moderationResolutionTask = cron.schedule(
    MODERATION_RESOLUTION_CRON,
    async () => {
      try {
        await withJobLock(JOB_NAME, { ttlMs: JOB_LOCK_TTL_MS }, () =>
          moderationService.dispatchPendingWorkerResolutions()
        );
      } catch (error) {
        logger.error("Moderation resolution notify job failed:", error);
      }
    }
  );

  logger.info(
    `Moderation resolution notify job scheduled with cron "${MODERATION_RESOLUTION_CRON}"`
  );
}

export function stopModerationResolutionJob(): void {
  if (!moderationResolutionTask) return;
  moderationResolutionTask.stop();
  moderationResolutionTask = null;
  logger.info("Moderation resolution notify job stopped");
}
