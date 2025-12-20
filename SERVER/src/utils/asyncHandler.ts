import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Async Handler - Wrapper để bắt lỗi async trong controllers
 * Loại bỏ việc phải viết try-catch trong mỗi controller method
 */
type AsyncRequestHandler<T = Request> = (
  req: T,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

export const asyncHandler = <T = Request>(
  fn: AsyncRequestHandler<T>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as T, res, next)).catch(next);
  };
};
