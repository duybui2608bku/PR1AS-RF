import { Router } from "express";
import { authController } from "../../controllers/auth/auth.controller";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { AuthRequest } from "../../middleware/auth";
import {
  authLimiter,
  refreshTokenLimiter,
  emailActionLimiter,
} from "../../middleware/rateLimiter";
import { csrfProtection } from "../../middleware/csrf";

const router = Router();

router.get(
  "/csrf-token",
  asyncHandler(authController.getCsrfToken.bind(authController))
);

router.post(
  "/register",
  authLimiter,
  ...csrfProtection,
  asyncHandler(authController.register.bind(authController))
);

router.post(
  "/login",
  authLimiter,
  ...csrfProtection,
  asyncHandler(authController.login.bind(authController))
);

router.post(
  "/refresh-token",
  refreshTokenLimiter,
  ...csrfProtection,
  asyncHandler(authController.refreshToken.bind(authController))
);

router.get(
  "/me",
  authenticate,
  asyncHandler<AuthRequest>(authController.getMe.bind(authController))
);

router.post(
  "/logout",
  authenticate,
  ...csrfProtection,
  asyncHandler(authController.logout.bind(authController))
);

router.patch(
  "/switch-role",
  authenticate,
  ...csrfProtection,
  asyncHandler<AuthRequest>(authController.switchRole.bind(authController))
);

router.patch(
  "/profile",
  authenticate,
  ...csrfProtection,
  asyncHandler<AuthRequest>(authController.updateProfile.bind(authController))
);

router.patch(
  "/update-profile",
  authenticate,
  ...csrfProtection,
  asyncHandler<AuthRequest>(
    authController.updateBasicProfile.bind(authController)
  )
);

router.post(
  "/forgot-password",
  emailActionLimiter,
  ...csrfProtection,
  asyncHandler(authController.forgotPassword.bind(authController))
);

router.post(
  "/reset-password",
  ...csrfProtection,
  asyncHandler(authController.resetPassword.bind(authController))
);

router.post(
  "/verify-email",
  ...csrfProtection,
  asyncHandler(authController.verifyEmail.bind(authController))
);

router.post(
  "/resend-verification",
  emailActionLimiter,
  ...csrfProtection,
  asyncHandler(authController.resendVerificationEmail.bind(authController))
);

export default router;
