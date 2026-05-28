import { Request, Response, NextFunction } from "express";
import DOMPurify from "isomorphic-dompurify";
import { AppError } from "../utils/AppError";

// Parser-based sanitisation. DOMPurify decodes entities, normalises mutation-
// XSS payloads, strips dangerous tags/attrs (script, iframe, object, embed,
// on*, javascript:, data:text/html, css expressions, svg/math vectors) and
// closes broken markup — things the previous regex chain missed and which
// would otherwise round-trip into rendered HTML on any client that trusts
// backend output. Default config strips no benign tags; pass field-specific
// configs at the call site for richer text fields.
const sanitizeString = (input: string): string => {
  if (typeof input !== "string") {
    return input;
  }

  const withoutNulls = input.replace(/\0/g, "");
  return DOMPurify.sanitize(withoutNulls, { USE_PROFILES: { html: true } });
};

const sanitizeObject = (obj: unknown): unknown => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (
        key.toLowerCase().includes("password") ||
        key.toLowerCase().includes("token") ||
        key.toLowerCase().includes("secret")
      ) {
        sanitized[key] = value;
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  }

  return obj;
};

const setSanitizedQuery = (req: Request, query: unknown): void => {
  // Express 5 exposes req.query via a getter without a setter. Defining an
  // own property keeps downstream handlers seeing the sanitized value without
  // assigning to the accessor.
  Object.defineProperty(req, "query", {
    value: query,
    configurable: true,
    enumerable: true,
    writable: true,
  });
};

export const sanitizeInput = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeObject(req.body) as typeof req.body;
    }

    if (req.query && typeof req.query === "object") {
      setSanitizedQuery(req, sanitizeObject(req.query));
    }

    if (req.params && typeof req.params === "object") {
      req.params = sanitizeObject(req.params) as typeof req.params;
    }

    next();
  } catch (error) {
    next(AppError.badRequest("Invalid input data"));
  }
};

export const validateContentSecurity = (
  content: string
): { isValid: boolean; reason?: string } => {
  if (typeof content !== "string") {
    return { isValid: true };
  }

  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /data:text\/html/i,
    /vbscript:/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(content)) {
      return {
        isValid: false,
        reason: "Content contains potentially dangerous patterns",
      };
    }
  }

  return { isValid: true };
};
