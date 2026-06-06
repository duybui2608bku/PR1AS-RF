import cron from "node-cron";
import { emailCampaignService } from "../services/email-campaign/email-campaign.service";
import { withJobLock } from "../utils/job-lock";
import { logger } from "../utils/logger";

const EMAIL_CAMPAIGN_CRON = "* * * * *";
const JOB_NAME = "email-campaign-scheduler";
const JOB_LOCK_TTL_MS = 55 * 1000;

let emailCampaignTask: ReturnType<typeof cron.schedule> | null = null;

export function startEmailCampaignJob(): void {
  if (emailCampaignTask) return;

  emailCampaignTask = cron.schedule(EMAIL_CAMPAIGN_CRON, async () => {
    try {
      await withJobLock(
        JOB_NAME,
        { ttlMs: JOB_LOCK_TTL_MS },
        () => emailCampaignService.processScheduledCampaigns()
      );
    } catch (error) {
      logger.error("Email campaign scheduler job failed:", error);
    }
  });

  logger.info(
    `Email campaign scheduler started with cron "${EMAIL_CAMPAIGN_CRON}"`
  );
}

export function stopEmailCampaignJob(): void {
  if (!emailCampaignTask) return;

  emailCampaignTask.stop();
  emailCampaignTask = null;
  logger.info("Email campaign scheduler stopped");
}
