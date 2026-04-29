import { Router } from "express";
import { userController } from "../../controllers/user/user.controller";
import { authenticate, adminOnly } from "../../middleware/auth";
import { pagination } from "../../middleware/pagination";
import { asyncHandler } from "../../utils/asyncHandler";
import { csrfProtection } from "../../middleware/csrf";

const router = Router();

router.use(authenticate);
router.use(adminOnly);

router.get(
  "/",
  pagination(),
  asyncHandler(userController.getUsers.bind(userController))
);

router.patch(
  "/:id/status",
  ...csrfProtection,
  asyncHandler(userController.updateUserStatus.bind(userController))
);

export default router;
