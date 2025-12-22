import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

/**
 * Interface mở rộng Request để thêm pagination info
 */
export interface PaginationRequest extends Request {
  pagination?: {
    page: number;
    limit: number;
    skip: number;
  };
}

/**
 * Options cho pagination middleware
 */
export interface PaginationOptions {
  defaultPage?: number;
  defaultLimit?: number;
  minLimit?: number;
  maxLimit?: number;
}

/**
 * Middleware xử lý phân trang
 * Validate và normalize page, limit từ query parameters
 *
 * @param options - Cấu hình pagination (default: page=1, limit=10, min=0, max=100)
 *
 * @example
 * router.get("/users", pagination(), userController.getUsers);
 * router.get("/products", pagination({ defaultLimit: 20, maxLimit: 50 }), productController.getProducts);
 */
export const pagination = (options: PaginationOptions = {}) => {
  const {
    defaultPage = 1,
    defaultLimit = 10,
    minLimit = 0,
    maxLimit = 100,
  } = options;

  return (req: PaginationRequest, _res: Response, next: NextFunction): void => {
    try {
      // Lấy page và limit từ query params
      const pageParam = req.query.page;
      const limitParam = req.query.limit;

      // Parse and validate page
      let page = defaultPage;
      if (pageParam !== undefined) {
        const parsedPage = Number(pageParam);
        if (isNaN(parsedPage) || parsedPage < 1) {
          throw AppError.badRequest(
            `Page must be a positive integer (>= 1). Received: ${pageParam}`
          );
        }
        page = parsedPage;
      }

      // Parse and validate limit
      let limit = defaultLimit;
      if (limitParam !== undefined) {
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
        limit = parsedLimit;
      } else {
        // If no limit in query, ensure default limit doesn't exceed max
        if (defaultLimit > maxLimit) {
          limit = maxLimit;
        }
      }

      // Tính skip
      const skip = (page - 1) * limit;

      // Gắn pagination info vào request
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
