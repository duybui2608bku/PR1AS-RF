import { Router } from "express";
import { commentController } from "../../controllers/comment/comment.controller";
import { authenticate, AuthRequest } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { csrfProtection } from "../../middleware/csrf";
import { validateObjectId } from "../../middleware/validateObjectId";

const router = Router();

router.patch(
  "/:id",
  authenticate,
  ...csrfProtection,
  validateObjectId("id"),
  asyncHandler<AuthRequest>(
    commentController.updateComment.bind(commentController)
  )
);

router.delete(
  "/:id",
  authenticate,
  ...csrfProtection,
  validateObjectId("id"),
  asyncHandler<AuthRequest>(
    commentController.deleteComment.bind(commentController)
  )
);

export default router;
