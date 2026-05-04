import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";
import { config } from "./config";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { sanitizeInput } from "./middleware/xss";
import { R } from "./utils/response";
import routes from "./routes";

export const createApp = (): express.Application => {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: config.security.csp.enabled
        ? {
            directives: config.security.csp.directives,
            ...(config.security.csp.upgradeInsecureRequests && {
              upgradeInsecureRequests: null,
            }),
          }
        : false,
      hsts: config.security.hsts,
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      dnsPrefetchControl: true,
      frameguard: { action: "deny" },
      hidePoweredBy: true,
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      xssFilter: true,
    })
  );

  app.use(
    cors({
      origin: config.corsOrigin,
      methods: config.corsMethods,
      credentials: config.corsCredentials,
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(sanitizeInput);
  app.use(compression());

  const morganFormat =
    config.nodeEnv === "production" ? "combined" : config.morgan.format;
  app.use(morgan(morganFormat));

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

  app.use("/api", routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

