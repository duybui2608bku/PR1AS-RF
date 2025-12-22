import { Router } from "express";
import { authController } from "../../controllers/auth/auth.controller";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { AuthRequest } from "../../middleware/auth";

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Đăng ký tài khoản mới
 * @access  Public
 */
router.post(
  "/register",
  asyncHandler(authController.register.bind(authController))
);

/**
 * @route   POST /api/auth/login
 * @desc    Đăng nhập
 * @access  Public
 */
router.post("/login", asyncHandler(authController.login.bind(authController)));

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Làm mới Access Token
 * @access  Public
 */
router.post(
  "/refresh-token",
  asyncHandler(authController.refreshToken.bind(authController))
);

/**
 * @route   GET /api/auth/me
 * @desc    Lấy thông tin user hiện tại
 * @access  Private
 */
router.get(
  "/me",
  authenticate,
  asyncHandler<AuthRequest>(authController.getMe.bind(authController))
);

/**
 * @route   POST /api/auth/logout
 * @desc    Đăng xuất
 * @access  Private
 */
router.post(
  "/logout",
  authenticate,
  asyncHandler(authController.logout.bind(authController))
);

/**
 * @route   PATCH /api/auth/switch-role
 * @desc    Chuyển đổi last_active_role giữa client và worker
 * @access  Private
 */
router.patch(
  "/switch-role",
  authenticate,
  asyncHandler<AuthRequest>(authController.switchRole.bind(authController))
);

export default router;
