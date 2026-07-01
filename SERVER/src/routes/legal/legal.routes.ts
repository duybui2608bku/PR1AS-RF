import { Router } from "express";
import { legalController } from "../../controllers/legal";
import { authenticate, adminOnly, AuthRequest } from "../../middleware/auth";
import { csrfProtection } from "../../middleware/csrf";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

// Public — any visitor can read a legal page's content (used for SSR).
router.get(
  "/:page",
  asyncHandler(legalController.getContent.bind(legalController))
);

// Admin only — partial update.
router.patch(
  "/:page",
  authenticate,
  adminOnly,
  ...csrfProtection,
  asyncHandler<AuthRequest>(legalController.updateContent.bind(legalController))
);

// Admin only — reset to factory defaults.
router.post(
  "/:page/reset",
  authenticate,
  adminOnly,
  ...csrfProtection,
  asyncHandler<AuthRequest>(legalController.resetContent.bind(legalController))
);

export default router;
