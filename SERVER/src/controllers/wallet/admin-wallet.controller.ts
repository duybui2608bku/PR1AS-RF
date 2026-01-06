import { Response } from "express";
import * as walletService from "../../services/wallet/wallet.service";
import { WALLET_MESSAGES } from "../../constants/messages";
import { transactionHistoryQuerySchema } from "../../validations/wallet/wallet.validation";
import { validateWithSchema, ResponseHelper } from "../../utils";
import { PaginationRequest } from "../../middleware/pagination";
import { PaginationHelper } from "../../utils/pagination";
import { AuthRequest } from "../../middleware/auth";

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

