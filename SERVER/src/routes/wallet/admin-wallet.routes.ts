import { Router } from "express";
import { adminWalletController } from "../../controllers/wallet/admin-wallet.controller";
import { authenticate, adminOnly } from "../../middleware/auth";
import { pagination } from "../../middleware/pagination";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.use(authenticate);
router.use(adminOnly);

router.get(
  "/transactions",
  pagination(),
  asyncHandler(
    adminWalletController.getAdminTransactionHistory.bind(adminWalletController)
  )
);

router.get(
  "/stats",
  asyncHandler(
    adminWalletController.getTransactionStats.bind(adminWalletController)
  )
);

router.get(
  "/top-users",
  asyncHandler(adminWalletController.getTopUsers.bind(adminWalletController))
);

router.get(
  "/chart",
  asyncHandler(
    adminWalletController.getTransactionChartData.bind(adminWalletController)
  )
);

export default router;
