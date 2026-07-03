import { Router } from "express";
import { voucherController } from "../../controllers/voucher";
import { asyncHandler } from "../../utils/asyncHandler";
import { adminOnly, authenticate } from "../../middleware/auth";
import { csrfProtection } from "../../middleware/csrf";

const router = Router();

router.post(
  "/redeem",
  authenticate,
  ...csrfProtection,
  asyncHandler(voucherController.redeemVoucher.bind(voucherController))
);

router.get(
  "/admin",
  authenticate,
  adminOnly,
  asyncHandler(voucherController.listVouchers.bind(voucherController))
);

router.post(
  "/admin",
  authenticate,
  adminOnly,
  asyncHandler(voucherController.createVouchers.bind(voucherController))
);

router.get(
  "/admin/:id",
  authenticate,
  adminOnly,
  asyncHandler(voucherController.getVoucherById.bind(voucherController))
);

router.patch(
  "/admin/:id",
  authenticate,
  adminOnly,
  asyncHandler(voucherController.updateVoucher.bind(voucherController))
);

router.delete(
  "/admin/:id",
  authenticate,
  adminOnly,
  asyncHandler(voucherController.deleteVoucher.bind(voucherController))
);

export default router;
