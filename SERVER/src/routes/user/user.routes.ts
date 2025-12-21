import { Router } from "express";
import * as userController from "../../controllers/user/user.controller";
import { authenticate, adminOnly } from "../../middleware/auth";

const router = Router();

// Apply authentication and admin check for all user management routes
router.use(authenticate);
router.use(adminOnly);

router.get("/", userController.getUsers);
router.patch("/:id/status", userController.updateUserStatus);

export default router;
