import "dotenv/config";
import { createServer } from "http";
import { config } from "./config";
import { logger } from "./utils/logger";
import { connectDatabase, closeDatabase } from "./config/database";
import { initializeSocket } from "./config/socket";
import { createApp } from "./app";

const app = createApp();
const httpServer = createServer(app);

initializeSocket(httpServer);

const startServer = async () => {
  try {
    await connectDatabase();

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
  httpServer.close(async () => {
    logger.info("HTTP server closed");
    await closeDatabase();
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  logger.info("SIGINT signal received: closing HTTP server");
  httpServer.close(async () => {
    logger.info("HTTP server closed");
    await closeDatabase();
    process.exit(0);
  });
});

startServer();
