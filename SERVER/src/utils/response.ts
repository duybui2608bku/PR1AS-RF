import { Response } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";

/**
 * Standard API Response Interface
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
    stack?: string;
  };
}

/**
 * Response Helper - Utility để chuẩn hóa tất cả API responses
 */
export class ResponseHelper {
  /**
   * Response thành công - 200 OK
   */
  static success<T>(
    res: Response,
    data: T,
    message?: string
  ): Response<ApiResponse<T>> {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      statusCode: HTTP_STATUS.OK,
      ...(message && { message }),
      data,
    });
  }

  /**
   * Response tạo mới - 201 Created
   */
  static created<T>(
    res: Response,
    data: T,
    message?: string
  ): Response<ApiResponse<T>> {
    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      statusCode: HTTP_STATUS.CREATED,
      ...(message && { message }),
      data,
    });
  }

  /**
   * Response không có nội dung - 204 No Content
   */
  static noContent(res: Response): Response {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  }

  /**
   * Response với status code tùy chỉnh
   */
  static send<T>(
    res: Response,
    statusCode: number,
    data: T,
    message?: string
  ): Response<ApiResponse<T>> {
    return res.status(statusCode).json({
      success: statusCode < 400,
      statusCode,
      ...(message && { message }),
      data,
    });
  }
}

export const R = ResponseHelper;
