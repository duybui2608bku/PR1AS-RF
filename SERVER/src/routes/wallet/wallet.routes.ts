import { Router } from "express";
import { walletController } from "../../controllers/wallet/wallet.controller";
import { authenticate } from "../../middleware/auth";
import { pagination } from "../../middleware/pagination";
import { asyncHandler } from "../../utils/asyncHandler";
import { csrfProtection } from "../../middleware/csrf";

const router = Router();

router.use(authenticate);

router.post(
  "/deposit",
  ...csrfProtection,
  asyncHandler(walletController.createDeposit.bind(walletController))
);

router.get(
  "/deposit/callback",
  asyncHandler(walletController.verifyDepositCallback.bind(walletController))
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

export default router;
