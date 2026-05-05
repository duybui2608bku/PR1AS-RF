import { Request, Response } from "express";
import { walletService } from "../../services/wallet/wallet.service";
import { WALLET_MESSAGES } from "../../constants/messages";
import {
  createDepositSchema,
  sePayWebhookSchema,
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
  async createDeposit(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const body = validateWithSchema(createDepositSchema, req.body);

    const result = await walletService.createDepositTransaction(userId, body);

    R.success(res, result, WALLET_MESSAGES.DEPOSIT_CREATED, req);
  }

  async handleSePayWebhook(req: Request, res: Response): Promise<void> {
    const body = validateWithSchema(sePayWebhookSchema, req.body);

    const result = await walletService.handleSePayWebhook(
      body,
      req.get("authorization") || undefined
    );

    res.status(200).json(result);
  }

  async checkSePayWebhook(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: "SePay webhook endpoint is ready. Use POST for webhook events.",
    });
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

  async getTransactionDetail(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { transactionId } = req.params;

    const transaction = await walletService.getWalletTransactionById(
      userId,
      transactionId
    );

    R.success(res, transaction, WALLET_MESSAGES.TRANSACTIONS_FETCHED, req);
  }
}

export const walletController = new WalletController();
