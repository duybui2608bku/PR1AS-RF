import { Router } from "express";
import { escrowController } from "../../controllers/escrow/escrow.controller";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { AuthRequest } from "../../middleware/auth";
import { adminOnly } from "../../middleware/auth";

const router = Router();

router.get(
  "/my",
  authenticate,
  asyncHandler<AuthRequest>(escrowController.getMyEscrows.bind(escrowController))
);

router.get(
  "/all",
  authenticate,
  adminOnly,
  asyncHandler<AuthRequest>(escrowController.getAllEscrows.bind(escrowController))
);

router.get(
  "/:id",
  authenticate,
  asyncHandler<AuthRequest>(escrowController.getEscrowById.bind(escrowController))
);

export default router;
