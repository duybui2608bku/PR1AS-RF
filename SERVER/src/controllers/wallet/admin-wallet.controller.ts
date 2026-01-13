import { Request, Response } from "express";
import * as walletService from "../../services/wallet/wallet.service";
import { WALLET_MESSAGES } from "../../constants/messages";
import {
  transactionHistoryQuerySchema,
  dateRangeQuerySchema,
} from "../../validations/wallet/wallet.validation";
import { validateWithSchema, ResponseHelper } from "../../utils";
import { PaginationRequest } from "../../middleware/pagination";
import { PaginationHelper } from "../../utils/pagination";
import { AuthRequest } from "../../middleware/auth";
import { DateRangePreset } from "../../constants/wallet";

export const getAdminTransactionHistory = async (
  req: PaginationRequest & AuthRequest,
  res: Response
): Promise<void> => {
  const query = validateWithSchema(transactionHistoryQuerySchema, req.query);
  const { page, limit, skip } = req.pagination!;

  const result = await walletService.getAdminTransactionHistory({
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

export const getTransactionStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  const query = validateWithSchema(dateRangeQuerySchema, req.query);
  const result = await walletService.getTransactionStats(
    query.date_range as DateRangePreset
  );
  ResponseHelper.success(res, result, WALLET_MESSAGES.STATS_FETCHED);
};

export const getTopUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  const query = validateWithSchema(dateRangeQuerySchema, req.query);
  const result = await walletService.getTopUsers(
    query.date_range as DateRangePreset
  );
  ResponseHelper.success(res, result, WALLET_MESSAGES.TOP_USERS_FETCHED);
};

export const getTransactionChartData = async (
  req: Request,
  res: Response
): Promise<void> => {
  const query = validateWithSchema(dateRangeQuerySchema, req.query);
  const result = await walletService.getTransactionChartData(
    query.date_range as DateRangePreset
  );
  ResponseHelper.success(res, result, WALLET_MESSAGES.CHART_DATA_FETCHED);
};
