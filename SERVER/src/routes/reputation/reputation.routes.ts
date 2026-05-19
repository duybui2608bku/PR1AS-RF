import { Router } from "express";
import { reputationController } from "../../controllers/reputation/reputation.controller";
import { authenticate, AuthRequest } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.use(authenticate);

router.get(
  "/history",
  asyncHandler<AuthRequest>(
    reputationController.listHistory.bind(reputationController)
  )
);

export default router;
