import { Response, Request } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";
import { t, getLocaleFromHeader } from "./i18n";
import { getMessageKey } from "./message-mapper";

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

export class ResponseHelper {
  static success<T>(
    res: Response,
    data: T,
    message?: string,
    req?: Request
  ): Response<ApiResponse<T>> {
    let translatedMessage = message;
    if (message && req) {
      const locale = getLocaleFromHeader(req.get("accept-language"));
      const messageKey = getMessageKey(message);
      translatedMessage = t(messageKey, locale);
    }
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      statusCode: HTTP_STATUS.OK,
      ...(translatedMessage && { message: translatedMessage }),
      data,
    });
  }

  static created<T>(
    res: Response,
    data: T,
    message?: string,
    req?: Request
  ): Response<ApiResponse<T>> {
    let translatedMessage = message;
    if (message && req) {
      const locale = getLocaleFromHeader(req.get("accept-language"));
      const messageKey = getMessageKey(message);
      translatedMessage = t(messageKey, locale);
    }
    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      statusCode: HTTP_STATUS.CREATED,
      ...(translatedMessage && { message: translatedMessage }),
      data,
    });
  }

  static noContent(res: Response): Response {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  }

  static send<T>(
    res: Response,
    statusCode: number,
    data: T,
    message?: string,
    req?: Request
  ): Response<ApiResponse<T>> {
    let translatedMessage = message;
    if (message && req) {
      const locale = getLocaleFromHeader(req.get("accept-language"));
      const messageKey = getMessageKey(message);
      translatedMessage = t(messageKey, locale);
    }
    return res.status(statusCode).json({
      success: statusCode < 400,
      statusCode,
      ...(translatedMessage && { message: translatedMessage }),
      data,
    });
  }
}

export const R = ResponseHelper;
