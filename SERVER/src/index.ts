import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import { logger } from "./utils/logger";
import { connectDatabase, closeDatabase } from "./config/database";
import { initializeSocket } from "./config/socket";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { R } from "./utils/response";
import routes from "./routes";

const app = express();
const httpServer = createServer(app);

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    methods: config.corsMethods,
    credentials: config.corsCredentials,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Compression middleware
app.use(compression());

// Logging middleware
const morganFormat =
  config.nodeEnv === "production" ? "combined" : config.morgan.format;
app.use(morgan(morganFormat));

// Health check endpoint
app.get("/health", (_req, res) => {
  R.success(
    res,
    {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    "Server is running"
  );
});

// API routes
app.use("/api", routes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize Socket.IO
initializeSocket(httpServer);

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Start HTTP server
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

// Graceful shutdown
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
