import { Request, RequestHandler } from "express";
import { AppError } from "../utils/AppError";
import { VALIDATION_LIMITS } from "../constants/validation";

export interface PaginationRequest extends Request {
  pagination?: {
    page: number;
    limit: number;
    skip: number;
  };
}

export interface PaginationOptions {
  defaultPage?: number;
  defaultLimit?: number;
  minLimit?: number;
  maxLimit?: number;
}

const parsePage = (pageParam: unknown, defaultPage: number): number => {
  if (pageParam === undefined) {
    return defaultPage;
  }

  const parsedPage = Number(pageParam);
  if (isNaN(parsedPage) || parsedPage < 1) {
    throw AppError.badRequest(
      `Page must be a positive integer (>= 1). Received: ${pageParam}`
    );
  }

  return parsedPage;
};

const parseLimit = (
  limitParam: unknown,
  defaultLimit: number,
  minLimit: number,
  maxLimit: number
): number => {
  if (limitParam === undefined) {
    return Math.min(defaultLimit, maxLimit);
  }

  const parsedLimit = Number(limitParam);
  if (isNaN(parsedLimit)) {
    throw AppError.badRequest(
      `Limit must be a number. Received: ${limitParam}`
    );
  }

  if (parsedLimit < minLimit) {
    throw AppError.badRequest(
      `Limit must be >= ${minLimit}. Received: ${parsedLimit}`
    );
  }

  if (parsedLimit > maxLimit) {
    throw AppError.badRequest(
      `Limit must not exceed ${maxLimit}. Received: ${parsedLimit}`
    );
  }

  return parsedLimit;
};

export const pagination = (options: PaginationOptions = {}): RequestHandler => {
  const {
    defaultPage = 1,
    defaultLimit = 10,
    minLimit = 0,
    maxLimit = VALIDATION_LIMITS.PAGINATION_MAX_LIMIT,
  } = options;

  return (req: PaginationRequest, _res, next) => {
    try {
      const page = parsePage(req.query.page, defaultPage);
      const limit = parseLimit(
        req.query.limit,
        defaultLimit,
        minLimit,
        maxLimit
      );
      const skip = (page - 1) * limit;
      req.pagination = {
        page,
        limit,
        skip,
      };
      next();
    } catch (error) {
      next(error);
    }
  };
};
