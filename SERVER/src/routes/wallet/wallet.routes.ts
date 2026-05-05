import { Router } from "express";
import { walletController } from "../../controllers/wallet/wallet.controller";
import { authenticate } from "../../middleware/auth";
import { pagination } from "../../middleware/pagination";
import { asyncHandler } from "../../utils/asyncHandler";
import { csrfProtection } from "../../middleware/csrf";

const router = Router();

router.post(
  "/deposit/webhook",
  asyncHandler(walletController.handleSePayWebhook.bind(walletController))
);

router.get(
  "/deposit/webhook",
  asyncHandler(walletController.checkSePayWebhook.bind(walletController))
);

router.use(authenticate);

router.post(
  "/deposit",
  ...csrfProtection,
  asyncHandler(walletController.createDeposit.bind(walletController))
);

router.get(
  "/balance",
  asyncHandler(walletController.getBalance.bind(walletController))
);

router.get(
  "/transactions",
  pagination(),
  asyncHandler(walletController.getTransactionHistory.bind(walletController))
);

router.get(
  "/transactions/:transactionId",
  asyncHandler(walletController.getTransactionDetail.bind(walletController))
);

export default router;
