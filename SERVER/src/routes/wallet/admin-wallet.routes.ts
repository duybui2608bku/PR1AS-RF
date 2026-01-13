import { Router } from "express";
import {
  getAdminTransactionHistory,
  getTransactionStats,
  getTopUsers,
  getTransactionChartData,
} from "../../controllers/wallet/admin-wallet.controller";
import { authenticate, adminOnly } from "../../middleware/auth";
import { pagination } from "../../middleware/pagination";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.use(authenticate);
router.use(adminOnly);

router.get(
  "/transactions",
  pagination(),
  asyncHandler(getAdminTransactionHistory.bind(getAdminTransactionHistory))
);

router.get("/stats", asyncHandler(getTransactionStats.bind(getTransactionStats)));

router.get("/top-users", asyncHandler(getTopUsers.bind(getTopUsers)));

router.get(
  "/chart",
  asyncHandler(getTransactionChartData.bind(getTransactionChartData))
);

export default router;
