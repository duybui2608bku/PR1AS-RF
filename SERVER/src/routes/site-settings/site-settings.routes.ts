import { Router } from "express";
import { siteSettingsController } from "../../controllers/site-settings";
import { authenticate, adminOnly, AuthRequest } from "../../middleware/auth";
import { csrfProtection } from "../../middleware/csrf";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

// Public — any visitor can read site settings (needed for SSR metadata)
router.get(
  "/",
  asyncHandler(
    siteSettingsController.getSettings.bind(siteSettingsController)
  )
);

// Admin only — partial update
router.patch(
  "/",
  authenticate,
  adminOnly,
  ...csrfProtection,
  asyncHandler<AuthRequest>(
    siteSettingsController.updateSettings.bind(siteSettingsController)
  )
);

// Admin only — reset to factory defaults
router.post(
  "/reset",
  authenticate,
  adminOnly,
  ...csrfProtection,
  asyncHandler<AuthRequest>(
    siteSettingsController.resetSettings.bind(siteSettingsController)
  )
);

export default router;
