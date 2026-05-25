import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { config } from "../config";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";

const SIGNATURE_HEADER = "x-sepay-signature";
const TIMESTAMP_HEADER = "x-sepay-timestamp";
const SIGNATURE_PREFIX = "sha256=";
const MAX_TIMESTAMP_SKEW_SECONDS = 5 * 60;

const safeEqual = (a: string, b: string): boolean => {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
};

const verifyHmacSignature = (req: Request): void => {
  const secret = config.sepay.hmacSecret;
  const signature = String(req.get(SIGNATURE_HEADER) || "").trim();
  const timestamp = String(req.get(TIMESTAMP_HEADER) || "").trim();
  const rawBody = req.rawBody ?? "";

  if (!signature || !timestamp) {
    throw AppError.unauthorized("Missing SePay signature or timestamp header");
  }

  if (!signature.startsWith(SIGNATURE_PREFIX)) {
    throw AppError.unauthorized("Invalid SePay signature format");
  }

  const tsSeconds = Number(timestamp);
  if (!Number.isFinite(tsSeconds)) {
    throw AppError.unauthorized("Invalid SePay timestamp");
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - tsSeconds) > MAX_TIMESTAMP_SKEW_SECONDS) {
    throw AppError.unauthorized("SePay timestamp is outside the allowed window");
  }

  const expected =
    SIGNATURE_PREFIX +
    crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

  if (!safeEqual(signature, expected)) {
    throw AppError.unauthorized("Invalid SePay signature");
  }
};

const verifyApiKey = (req: Request): void => {
  const expectedHeader = `Apikey ${config.sepay.webhookApiKey}`;
  const provided = req.get("authorization")?.trim();
  if (provided !== expectedHeader) {
    throw AppError.unauthorized("Invalid SePay webhook API key");
  }
};

export const verifySePayWebhookSignature = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    if (config.sepay.hmacSecret) {
      verifyHmacSignature(req);
    } else if (config.sepay.webhookApiKey) {
      verifyApiKey(req);
    } else {
      logger.warn(
        "SePay webhook received without authentication configured (SEPAY_HMAC_SHA256 / SEPAY_WEBHOOK_API_KEY are empty)"
      );
    }
    next();
  } catch (error) {
    next(error);
  }
};
