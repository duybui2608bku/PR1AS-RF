import "dotenv/config";
import { createServer } from "http";
import { config } from "./config";
import { logger } from "./utils/logger";
import { connectDatabase, closeDatabase } from "./config/database";
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
import { reputationConfigService } from "./services/reputation/reputation-config.service";

const app = createApp();
const httpServer = createServer(app);

initializeSocket(httpServer);

const startServer = async () => {
  try {
    await connectDatabase();
    await reputationConfigService.seedDefaults();
    startBookingExpirationJob();
    startBookingReminderJob();
    startReputationRecoveryJob();

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
  httpServer.close(async () => {
    logger.info("HTTP server closed");
    await closeDatabase();
    process.exit(0);
  });
});

startServer();
