import { Router } from "express";
import { userController } from "../../controllers/user/user.controller";
import { authenticate, adminOnly, AuthRequest } from "../../middleware/auth";
import { pagination } from "../../middleware/pagination";
import { asyncHandler } from "../../utils/asyncHandler";
import { csrfProtection } from "../../middleware/csrf";
import { validateObjectId } from "../../middleware";

const router = Router();

// Authenticated (any role): personal stats
router.get(
  "/me/post-stats",
  authenticate,
  asyncHandler<AuthRequest>(userController.getMyPostStats.bind(userController))
);

// Admin-only routes
router.use(authenticate, adminOnly);

router.get(
  "/",
  pagination(),
  asyncHandler(userController.getUsers.bind(userController))
);

router.post(
  "/",
  ...csrfProtection,
  asyncHandler(userController.createUser.bind(userController))
);

router.get(
  "/:id",
  validateObjectId("id"),
  asyncHandler(userController.getUserById.bind(userController))
);

router.put(
  "/:id",
  validateObjectId("id"),
  ...csrfProtection,
  asyncHandler(userController.updateUser.bind(userController))
);

router.patch(
  "/:id/status",
  validateObjectId("id"),
  ...csrfProtection,
  asyncHandler(userController.updateUserStatus.bind(userController))
);

router.delete(
  "/:id",
  validateObjectId("id"),
  ...csrfProtection,
  asyncHandler(userController.deleteUser.bind(userController))
);

export default router;
