const getCorsOrigin = () => {
  const envOrigin = process.env.CORS_ORIGIN;

  if (envOrigin) {
    return envOrigin.includes(",")
      ? envOrigin.split(",").map((o) => o.trim())
      : envOrigin;
  }

  if (process.env.NODE_ENV !== "production") {
    return (
      origin: string | undefined,

      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      if (
        !origin ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    };
  }

  return "http://localhost:3000";
};

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  emailAccount: process.env.EMAIL_ACCOUNT || "no-reply@example.com",
  googleAppPassword:
    process.env.GOGGLE_APP_PASSWORD || "your-google-app-password",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigin: getCorsOrigin(),
  corsMethods: process.env.CORS_METHODS?.split(",") || [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
  ],
  corsCredentials: process.env.CORS_CREDENTIALS === "true" || true,
  jwtSecret: process.env.JWT_SECRET || "jwt_secret",
  jwtExpire: process.env.JWT_EXPIRE || "15m",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "jwt_refresh_secret",
  jwtRefreshExpire: process.env.JWT_REFRESH_EXPIRE || "7d",
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017",
  dbName: process.env.DB_NAME || "db_name",
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || "100", 10),
  },

  morgan: {
    format: process.env.MORGAN_FORMAT || "dev",
  },
  socket: {
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT || "60000", 10),
    methods: process.env.SOCKET_METHODS?.split(",") || ["GET", "POST"],
  },
  logger: {
    logDir: process.env.LOG_DIR || "logs",
    errorLogFile: process.env.ERROR_LOG_FILE || "error.log",
    combinedLogFile: process.env.COMBINED_LOG_FILE || "combined.log",
  },
  security: {
    csp: {
      enabled: process.env.CSP_ENABLED !== "false",
      upgradeInsecureRequests:
        process.env.CSP_UPGRADE_INSECURE === "true" || false,
      directives: {
        defaultSrc: process.env.CSP_DEFAULT_SRC?.split(",") || ["'self'"],
        styleSrc: process.env.CSP_STYLE_SRC?.split(",") || [
          "'self'",
          "'unsafe-inline'",
        ],
        scriptSrc: process.env.CSP_SCRIPT_SRC?.split(",") || ["'self'"],
        imgSrc: process.env.CSP_IMG_SRC?.split(",") || [
          "'self'",
          "data:",
          "https:",
        ],
        fontSrc: process.env.CSP_FONT_SRC?.split(",") || ["'self'", "data:"],
        connectSrc: process.env.CSP_CONNECT_SRC?.split(",") || ["'self'"],
        frameSrc: process.env.CSP_FRAME_SRC?.split(",") || ["'none'"],
        objectSrc: process.env.CSP_OBJECT_SRC?.split(",") || ["'none'"],
        baseUri: process.env.CSP_BASE_URI?.split(",") || ["'self'"],
        formAction: process.env.CSP_FORM_ACTION?.split(",") || ["'self'"],
      },
    },
    hsts: {
      maxAge: parseInt(process.env.HSTS_MAX_AGE || "31536000", 10),
      includeSubDomains: process.env.HSTS_INCLUDE_SUBDOMAINS !== "false",
      preload: process.env.HSTS_PRELOAD === "true" || false,
    },
  },
  vnpay: {
    tmnCode: process.env.VNPAY_TMN_CODE || "PAJ1DL8M",
    secureSecret:
      process.env.VNPAY_SECURE_SECRET || "J4CKYRXGCC4XE94PNN4SFTZBZRMZRZH6",
    vnpayHost: process.env.VNPAY_HOST || "https://sandbox.vnpayment.vn",
    testMode: process.env.VNPAY_TEST_MODE === "true" || true,
    hashAlgorithm: process.env.VNPAY_HASH_ALGORITHM || "SHA512",
    returnUrl:
      process.env.VNPAY_RETURN_URL ||
      `${process.env.FRONTEND_URL || "http://localhost:3000"}/wallet/deposit/callback`,
  },
};
