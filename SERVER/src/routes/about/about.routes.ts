import { Router } from "express";
import { aboutController } from "../../controllers/about";
import { authenticate, adminOnly, AuthRequest } from "../../middleware/auth";
import { csrfProtection } from "../../middleware/csrf";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

// Public — any visitor can read the About page content (used for SSR).
router.get("/", asyncHandler(aboutController.getContent.bind(aboutController)));

// Admin only — partial update.
router.patch(
  "/",
  authenticate,
  adminOnly,
  ...csrfProtection,
  asyncHandler<AuthRequest>(aboutController.updateContent.bind(aboutController))
);

// Admin only — reset to factory defaults.
router.post(
  "/reset",
  authenticate,
  adminOnly,
  ...csrfProtection,
  asyncHandler<AuthRequest>(aboutController.resetContent.bind(aboutController))
);

export default router;
