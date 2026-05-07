import { Router } from "express";
import { reactionController } from "../../controllers/reaction/reaction.controller";
import { authenticate, AuthRequest } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { csrfProtection } from "../../middleware/csrf";

const router = Router();

router.get(
  "/summary",
  authenticate,
  asyncHandler<AuthRequest>(reactionController.summary.bind(reactionController))
);

router.post(
  "/",
  authenticate,
  ...csrfProtection,
  asyncHandler<AuthRequest>(reactionController.upsert.bind(reactionController))
);

router.delete(
  "/",
  authenticate,
  ...csrfProtection,
  asyncHandler<AuthRequest>(reactionController.remove.bind(reactionController))
);

export default router;
