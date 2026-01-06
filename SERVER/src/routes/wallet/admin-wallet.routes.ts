import { Router } from "express";
import { getAdminTransactionHistory } from "../../controllers/wallet/admin-wallet.controller";
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

export default router;
