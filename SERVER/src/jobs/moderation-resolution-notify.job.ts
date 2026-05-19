import cron from "node-cron";
import { moderationService } from "../services/moderation";
import { logger } from "../utils/logger";

const MODERATION_RESOLUTION_CRON = "*/30 * * * * *";

let moderationResolutionTask: ReturnType<typeof cron.schedule> | null = null;
let isModerationResolutionRunning = false;

export function startModerationResolutionJob(): void {
  if (moderationResolutionTask) return;

  moderationResolutionTask = cron.schedule(
    MODERATION_RESOLUTION_CRON,
    async () => {
      if (isModerationResolutionRunning) return;
      isModerationResolutionRunning = true;

      try {
        await moderationService.dispatchPendingWorkerResolutions();
      } catch (error) {
        logger.error("Moderation resolution notify job failed:", error);
      } finally {
        isModerationResolutionRunning = false;
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
