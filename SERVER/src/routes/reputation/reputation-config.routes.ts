import { Router } from "express";
import { reputationConfigController } from "../../controllers/reputation/reputation-config.controller";
import { authenticate, adminOnly } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import type { AuthRequest } from "../../middleware/auth";

const router = Router();

router.use(authenticate);
router.use(adminOnly);

router.get(
  "/",
  asyncHandler<AuthRequest>(
    reputationConfigController.getAll.bind(reputationConfigController)
  )
);

router.patch(
  "/:key",
  asyncHandler<AuthRequest>(
    reputationConfigController.update.bind(reputationConfigController)
  )
);

export default router;
