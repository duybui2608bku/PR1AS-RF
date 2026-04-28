import { Request, Response } from "express";
import { walletService } from "../../services/wallet/wallet.service";
import { WALLET_MESSAGES } from "../../constants/messages";
import {
  transactionHistoryQuerySchema,
  dateRangeQuerySchema,
} from "../../validations/wallet/wallet.validation";
import { validateWithSchema, R, PaginationHelper } from "../../utils";
import { PaginationRequest } from "../../middleware/pagination";
import { AuthRequest } from "../../middleware/auth";
import { DateRangePreset } from "../../constants/wallet";

export class AdminWalletController {
  async getAdminTransactionHistory(
    req: PaginationRequest & AuthRequest,
    res: Response
  ): Promise<void> {
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

    R.success(res, response, WALLET_MESSAGES.TRANSACTIONS_FETCHED, req);
  }

  async getTransactionStats(req: Request, res: Response): Promise<void> {
    const query = validateWithSchema(dateRangeQuerySchema, req.query);
    const result = await walletService.getTransactionStats(
      query.date_range as DateRangePreset
    );
    R.success(res, result, WALLET_MESSAGES.STATS_FETCHED, req);
  }

  async getTopUsers(req: Request, res: Response): Promise<void> {
    const query = validateWithSchema(dateRangeQuerySchema, req.query);
    const result = await walletService.getTopUsers(
      query.date_range as DateRangePreset
    );
    R.success(res, result, WALLET_MESSAGES.TOP_USERS_FETCHED, req);
  }

  async getTransactionChartData(req: Request, res: Response): Promise<void> {
    const query = validateWithSchema(dateRangeQuerySchema, req.query);
    const result = await walletService.getTransactionChartData(
      query.date_range as DateRangePreset
    );
    R.success(res, result, WALLET_MESSAGES.CHART_DATA_FETCHED, req);
  }
}

export const adminWalletController = new AdminWalletController();
