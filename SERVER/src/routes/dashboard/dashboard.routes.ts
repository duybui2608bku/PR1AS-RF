import { Router } from "express";

import { dashboardController } from "../../controllers/dashboard/dashboard.controller";
import { adminOnly, authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.use(authenticate);
router.use(adminOnly);

router.get(
  "/analytics",
  asyncHandler(dashboardController.getAnalytics.bind(dashboardController))
);

export default router;
