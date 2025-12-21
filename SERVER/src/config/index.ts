export const config = {
  // Server Configuration
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  // CORS Configuration
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  corsMethods: process.env.CORS_METHODS?.split(",") || [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
  ],
  corsCredentials: process.env.CORS_CREDENTIALS === "true" || true,

  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || "pr1as",
  jwtExpire: process.env.JWT_EXPIRE || "15m",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "pr1as_refresh",
  jwtRefreshExpire: process.env.JWT_REFRESH_EXPIRE || "7d",

  // Database Configuration
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017",
  dbName: process.env.DB_NAME || "pr1as",

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10), // 15 minutes default
    max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10), // 100 requests per window
  },

  // Morgan Logging Configuration
  morgan: {
    format: process.env.MORGAN_FORMAT || "dev", // 'dev' for development, 'combined' for production
  },

  // Socket.IO Configuration
  socket: {
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT || "60000", 10), // 60 seconds
    methods: process.env.SOCKET_METHODS?.split(",") || ["GET", "POST"],
  },

  // Logger Configuration
  logger: {
    logDir: process.env.LOG_DIR || "logs",
    errorLogFile: process.env.ERROR_LOG_FILE || "error.log",
    combinedLogFile: process.env.COMBINED_LOG_FILE || "combined.log",
  },
} as const;
