import cron from "node-cron";
import { pricingService } from "../services/pricing";
import { withJobLock } from "../utils/job-lock";
import { logger } from "../utils/logger";

// Run hourly at minute 5 to give just-expired plans a quick downgrade window.
const PLAN_EXPIRATION_CRON = "5 * * * *";
const JOB_NAME = "plan-expiration";
const JOB_LOCK_TTL_MS = 10 * 60 * 1000;

let planExpirationTask: ReturnType<typeof cron.schedule> | null = null;

export function startPlanExpirationJob(): void {
  if (planExpirationTask) return;

  planExpirationTask = cron.schedule(PLAN_EXPIRATION_CRON, async () => {
    try {
      const result = await withJobLock(
        JOB_NAME,
        { ttlMs: JOB_LOCK_TTL_MS },
        () => pricingService.expireOverdueUserPlans()
      );

      if (typeof result === "number" && result > 0) {
        logger.info(
          `Plan expiration: downgraded ${result} user(s) to STANDARD`
        );
      }
    } catch (error) {
      logger.error("Plan expiration job failed:", error);
    }
  });

  logger.info(
    `Plan expiration job scheduled with cron "${PLAN_EXPIRATION_CRON}"`
  );
}

export function stopPlanExpirationJob(): void {
  if (!planExpirationTask) return;

  planExpirationTask.stop();
  planExpirationTask = null;
  logger.info("Plan expiration job stopped");
}
