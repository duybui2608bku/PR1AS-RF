import "dotenv/config";
import { createServer } from "http";
import { config } from "./config";
import { logger } from "./utils/logger";
import {
  connectDatabase,
  closeDatabase,
  syncAllIndexes,
} from "./config/database";
import { initializeSocket } from "./config/socket";
import { createApp } from "./app";
import {
  startBookingExpirationJob,
  stopBookingExpirationJob,
} from "./jobs/booking-expiration.job";
import {
  startReputationRecoveryJob,
  stopReputationRecoveryJob,
} from "./jobs/reputation-recovery.job";
import {
  startBookingReminderJob,
  stopBookingReminderJob,
} from "./jobs/booking-reminder.job";
import {
  startModerationResolutionJob,
  stopModerationResolutionJob,
} from "./jobs/moderation-resolution-notify.job";
import {
  startPlanExpirationJob,
  stopPlanExpirationJob,
} from "./jobs/plan-expiration.job";
import {
  startAccountDeletionJob,
  stopAccountDeletionJob,
} from "./jobs/account-deletion.job";
import {
  startWalletReconciliationJob,
  stopWalletReconciliationJob,
} from "./jobs/wallet-reconciliation.job";
import { reputationConfigService } from "./services/reputation/reputation-config.service";

const app = createApp();
const httpServer = createServer(app);

initializeSocket(httpServer);

const startServer = async () => {
  try {
    await connectDatabase();
    await syncAllIndexes();
    await reputationConfigService.seedDefaults();
    startBookingExpirationJob();
    startBookingReminderJob();
    startReputationRecoveryJob();
    startModerationResolutionJob();
    startPlanExpirationJob();
    startAccountDeletionJob();
    startWalletReconciliationJob();

    httpServer.listen(config.port, () => {
      logger.info(
        `Server is running on port ${config.port} in ${config.nodeEnv} mode`
      );
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", async () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  stopBookingExpirationJob();
  stopBookingReminderJob();
  stopReputationRecoveryJob();
  stopModerationResolutionJob();
  stopPlanExpirationJob();
  stopAccountDeletionJob();
  stopWalletReconciliationJob();
  httpServer.close(async () => {
    logger.info("HTTP server closed");
    await closeDatabase();
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  logger.info("SIGINT signal received: closing HTTP server");
  stopBookingExpirationJob();
  stopBookingReminderJob();
  stopReputationRecoveryJob();
  stopModerationResolutionJob();
  stopPlanExpirationJob();
  stopAccountDeletionJob();
  stopWalletReconciliationJob();
  httpServer.close(async () => {
    logger.info("HTTP server closed");
    await closeDatabase();
    process.exit(0);
  });
});

startServer();
