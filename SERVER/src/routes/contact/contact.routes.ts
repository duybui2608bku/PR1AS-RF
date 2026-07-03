import { Router } from "express";
import { contactController } from "../../controllers/contact";
import { authenticate, adminOnly, AuthRequest } from "../../middleware/auth";
import { csrfProtection } from "../../middleware/csrf";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

// Public — any visitor can read the Contact page content (used for SSR).
router.get(
  "/",
  asyncHandler(contactController.getContent.bind(contactController))
);

// Admin only — partial update.
router.patch(
  "/",
  authenticate,
  adminOnly,
  ...csrfProtection,
  asyncHandler<AuthRequest>(
    contactController.updateContent.bind(contactController)
  )
);

// Admin only — reset to factory defaults.
router.post(
  "/reset",
  authenticate,
  adminOnly,
  ...csrfProtection,
  asyncHandler<AuthRequest>(
    contactController.resetContent.bind(contactController)
  )
);

export default router;
