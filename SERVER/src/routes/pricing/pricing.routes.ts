import { Router } from "express";
import { pricingController } from "../../controllers/pricing";
import { asyncHandler } from "../../utils/asyncHandler";
import { adminOnly, authenticate } from "../../middleware/auth";
import { csrfProtection } from "../../middleware/csrf";

const router = Router();

router.get(
  "/packages",
  asyncHandler(pricingController.getPublicPackages.bind(pricingController))
);

router.get(
  "/me",
  authenticate,
  asyncHandler(pricingController.getMyPricing.bind(pricingController))
);

router.post(
  "/upgrade",
  authenticate,
  ...csrfProtection,
  asyncHandler(pricingController.upgradePricing.bind(pricingController))
);

router.get(
  "/packages/admin",
  authenticate,
  adminOnly,
  asyncHandler(pricingController.getAllPackages.bind(pricingController))
);

router.post(
  "/packages/admin",
  authenticate,
  adminOnly,
  asyncHandler(pricingController.createPackage.bind(pricingController))
);

router.get(
  "/packages/admin/:id",
  authenticate,
  adminOnly,
  asyncHandler(pricingController.getPackageById.bind(pricingController))
);

router.patch(
  "/packages/admin/:id",
  authenticate,
  adminOnly,
  asyncHandler(pricingController.updatePackage.bind(pricingController))
);

router.delete(
  "/packages/admin/:id",
  authenticate,
  adminOnly,
  asyncHandler(pricingController.deletePackage.bind(pricingController))
);

export default router;
