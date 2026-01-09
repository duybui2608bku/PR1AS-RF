import { Response } from "express";

import * as walletService from "../../services/wallet/wallet.service";

import { WALLET_MESSAGES, AUTH_MESSAGES } from "../../constants/messages";

import {
  createDepositSchema,
  transactionHistoryQuerySchema,
} from "../../validations/wallet/wallet.validation";

import { validateWithSchema, ResponseHelper } from "../../utils";

import { PaginationRequest } from "../../middleware/pagination";

import { PaginationHelper } from "../../utils/pagination";

import { AuthRequest } from "../../middleware/auth";

import { AppError } from "../../utils/AppError";

const getClientIp = (req: AuthRequest): string => {
  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }

  if (typeof forwarded === "object" && forwarded?.[0]) {
    return forwarded[0].trim();
  }

  return req.socket.remoteAddress || "127.0.0.1";
};

export const createDeposit = async (
  req: AuthRequest,

  res: Response
): Promise<void> => {
  const userId = req.user?.sub;

  if (!userId) {
    throw AppError.unauthorized(AUTH_MESSAGES.LOGIN_REQUIRED);
  }

  const body = validateWithSchema(createDepositSchema, req.body);

  const ipAddress = getClientIp(req);

  const result = await walletService.createDepositTransaction(
    userId,

    body,

    ipAddress
  );

  ResponseHelper.success(res, result, WALLET_MESSAGES.DEPOSIT_CREATED);
};

export const verifyDepositCallback = async (
  req: AuthRequest,

  res: Response
): Promise<void> => {
  const userId = req.user?.sub;

  if (!userId) {
    throw AppError.unauthorized(AUTH_MESSAGES.LOGIN_REQUIRED);
  }

  await walletService.verifyDepositPayment(
    userId,

    req.query as Record<string, string>
  );

  ResponseHelper.success(res, null, WALLET_MESSAGES.PAYMENT_VERIFIED);
};

export const getBalance = async (
  req: AuthRequest,

  res: Response
): Promise<void> => {
  const userId = req.user?.sub;

  if (!userId) {
    throw AppError.unauthorized(AUTH_MESSAGES.LOGIN_REQUIRED);
  }

  const balance = await walletService.getWalletBalance(userId);

  ResponseHelper.success(res, balance, WALLET_MESSAGES.BALANCE_FETCHED);
};

export const getTransactionHistory = async (
  req: PaginationRequest & AuthRequest,

  res: Response
): Promise<void> => {
  const userId = req.user?.sub;

  if (!userId) {
    throw AppError.unauthorized(AUTH_MESSAGES.LOGIN_REQUIRED);
  }

  const query = validateWithSchema(transactionHistoryQuerySchema, req.query);

  const { page, limit, skip } = req.pagination!;

  const result = await walletService.getTransactionHistory(userId, {
    ...query,

    page,

    limit,

    skip,
  });

  const response = PaginationHelper.format(
    result.transactions,

    req.pagination!,

    result.total
  );

  ResponseHelper.success(res, response, WALLET_MESSAGES.TRANSACTIONS_FETCHED);
};
