import { Router } from "express";

import {
  createDeposit,
  verifyDepositCallback,
  getBalance,
  getTransactionHistory,
} from "../../controllers/wallet/wallet.controller";

import { authenticate } from "../../middleware/auth";

import { pagination } from "../../middleware/pagination";

import { asyncHandler } from "../../utils/asyncHandler";

import { csrfProtection } from "../../middleware/csrf";

const router = Router();

router.use(authenticate);

router.post(
  "/deposit",

  ...csrfProtection,

  asyncHandler(createDeposit.bind(createDeposit))
);

router.get(
  "/deposit/callback",

  asyncHandler(verifyDepositCallback.bind(verifyDepositCallback))
);

router.get("/balance", asyncHandler(getBalance.bind(getBalance)));

router.get(
  "/transactions",

  pagination(),

  asyncHandler(getTransactionHistory.bind(getTransactionHistory))
);

export default router;

