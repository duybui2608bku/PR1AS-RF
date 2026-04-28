import { Response } from "express";
import { walletService } from "../../services/wallet/wallet.service";
import { WALLET_MESSAGES } from "../../constants/messages";
import {
  createDepositSchema,
  transactionHistoryQuerySchema,
} from "../../validations/wallet/wallet.validation";
import {
  validateWithSchema,
  R,
  extractUserIdFromRequest,
  PaginationHelper,
} from "../../utils";
import { PaginationRequest } from "../../middleware/pagination";
import { AuthRequest } from "../../middleware/auth";

export class WalletController {
  private getClientIp(req: AuthRequest): string {
    const forwarded = req.headers["x-forwarded-for"];

    if (typeof forwarded === "string") {
      return forwarded.split(",")[0].trim();
    }

    if (Array.isArray(forwarded) && forwarded[0]) {
      return forwarded[0].trim();
    }

    return req.socket.remoteAddress || "127.0.0.1";
  }

  async createDeposit(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const body = validateWithSchema(createDepositSchema, req.body);
    const ipAddress = this.getClientIp(req);

    const result = await walletService.createDepositTransaction(
      userId,
      body,
      ipAddress
    );

    R.success(res, result, WALLET_MESSAGES.DEPOSIT_CREATED, req);
  }

  async verifyDepositCallback(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    await walletService.verifyDepositPayment(
      userId,
      req.query as Record<string, string>
    );

    R.success(res, null, WALLET_MESSAGES.PAYMENT_VERIFIED, req);
  }

  async getBalance(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const balance = await walletService.getWalletBalance(userId);

    R.success(res, balance, WALLET_MESSAGES.BALANCE_FETCHED, req);
  }

  async getTransactionHistory(
    req: PaginationRequest & AuthRequest,
    res: Response
  ): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const query = validateWithSchema(transactionHistoryQuerySchema, req.query);
    const { page, limit, skip } = req.pagination!;
    const result = await walletService.getTransactionHistory(userId, {
      ...query,
      user_id: userId,
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
}

export const walletController = new WalletController();
