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
  throw new Error(
    "CORS_ORIGIN must be configured in production. Set CORS_ORIGIN to your frontend URL(s), comma-separated."
  );
};

const nodeEnv = process.env.NODE_ENV || "development";
const jwtSecret = process.env.JWT_SECRET || "jwt_secret";
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || "jwt_refresh_secret";

if (
  nodeEnv === "production" &&
  (jwtSecret === "jwt_secret" || jwtRefreshSecret === "jwt_refresh_secret")
) {
  throw new Error("JWT secrets are not configured for production environment");
}

// Verification / password-reset emails embed links to the frontend; if this is
// wrong (or defaults to the API host) every email link is broken. Fail closed
// in production rather than silently shipping bad links.
const frontendUrl = process.env.FRONTEND_URL;
if (nodeEnv === "production" && !frontendUrl) {
  throw new Error(
    "FRONTEND_URL must be configured in production. It is used to build email verification and password-reset links."
  );
}

// `trust proxy` setting passed to Express. Accepts a hop count (e.g. "1") or a
// boolean ("true"/"false"). Defaults: production trusts one proxy hop; dev runs
// with no proxy so it stays false (keeps `req.ip` honest and avoids spurious
// express-rate-limit X-Forwarded-For warnings).
const parseTrustProxy = (): number | boolean => {
  const raw = process.env.TRUST_PROXY;
  if (raw === undefined || raw === "") {
    return nodeEnv === "production" ? 1 : false;
  }
  if (raw === "true") return true;
  if (raw === "false") return false;
  const hops = parseInt(raw, 10);
  return Number.isNaN(hops) ? nodeEnv === "production" : hops;
};

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  emailAccount: process.env.EMAIL_ACCOUNT || "no-reply@example.com",
  googleAppPassword:
    process.env.GOGGLE_APP_PASSWORD || "your-google-app-password",
  // Transactional email transport. In production use a real ESP (Resend) so
  // SPF/DKIM/DMARC align with the From domain and mail lands in the inbox
  // rather than spam. When SMTP_HOST is unset we fall back to the Gmail
  // account above — acceptable for local dev only, NOT production.
  mail: {
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
    smtpUser: process.env.SMTP_USER || "",
    smtpPass: process.env.SMTP_PASS || "",
    // The From header MUST be an address on a domain the ESP is authorized to
    // send for (verified in Resend); otherwise DMARC fails → spam. Defaults to
    // the Gmail account so the dev fallback stays self-consistent.
    from:
      process.env.EMAIL_FROM ||
      `PR1AS <${process.env.EMAIL_ACCOUNT || "no-reply@example.com"}>`,
  },
  // Dev default points at the Next client (3001), not the API (3000), so email
  // links open in the app during local testing.
  frontendUrl: frontendUrl || "http://localhost:3001",
  trustProxy: parseTrustProxy(),
  nodeEnv,
  corsOrigin: getCorsOrigin(),
  corsMethods: process.env.CORS_METHODS?.split(",") || [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
  ],
  corsExposedHeaders: process.env.CORS_EXPOSED_HEADERS?.split(",") || [
    "X-CSRF-Token",
  ],
  corsCredentials: process.env.CORS_CREDENTIALS
    ? process.env.CORS_CREDENTIALS === "true"
    : true,
  jwtSecret,
  jwtExpire: process.env.JWT_EXPIRE || "15m",
  jwtRefreshSecret,
  jwtRefreshExpire: process.env.JWT_REFRESH_EXPIRE || "7d",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
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
  notification: {
    vapidSubject:
      process.env.WEB_PUSH_VAPID_SUBJECT ||
      `mailto:${process.env.EMAIL_ACCOUNT || "no-reply@example.com"}`,
    vapidPublicKey: process.env.WEB_PUSH_VAPID_PUBLIC_KEY || "",
    vapidPrivateKey: process.env.WEB_PUSH_VAPID_PRIVATE_KEY || "",
  },
  logger: {
    logDir: process.env.LOG_DIR || "logs",
    errorLogFile: process.env.ERROR_LOG_FILE || "error.log",
    combinedLogFile: process.env.COMBINED_LOG_FILE || "combined.log",
  },
  security: {
    csrf: {
      enabled: process.env.CSRF_ENABLED !== "false",
    },
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
  sepay: {
    bankAccountNumber: process.env.SEPAY_BANK_ACCOUNT_NUMBER || "SEPBD36270",
    bankName: process.env.SEPAY_BANK_NAME || "OCB",
    webhookApiKey: process.env.SEPAY_WEBHOOK_API_KEY || "",
    hmacSecret: process.env.SEPAY_HMAC_SHA256 || "",
    paymentCodePrefix: process.env.SEPAY_PAYMENT_CODE_PREFIX || "PRAS",
    qrBaseUrl: process.env.SEPAY_QR_BASE_URL || "https://qr.sepay.vn/img",
  },
  media: {
    allowedHosts: (process.env.MEDIA_ALLOWED_HOSTS || "")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean),
  },
};
