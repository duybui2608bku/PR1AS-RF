import { Router } from "express";
import {
  getUsers,
  updateUserStatus,
} from "../../controllers/user/user.controller";
import { authenticate, adminOnly } from "../../middleware/auth";
import { pagination } from "../../middleware/pagination";
import { asyncHandler } from "../../utils/asyncHandler";
import { csrfProtection } from "../../middleware/csrf";

const router = Router();

router.use(authenticate);
router.use(adminOnly);

router.get("/", pagination(), asyncHandler(getUsers.bind(getUsers)));

router.patch(
  "/:id/status",
  ...csrfProtection,
  asyncHandler(updateUserStatus.bind(updateUserStatus))
);

export default router;
