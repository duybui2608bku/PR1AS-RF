import { Router } from "express";
import { commentController } from "../../controllers/comment/comment.controller";
import { authenticate, AuthRequest } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { csrfProtection } from "../../middleware/csrf";
import { validateObjectId } from "../../middleware/validateObjectId";

// `mergeParams: true` lets handlers read `:postId` from the parent router
// (post.routes.ts) when this router is mounted at `/posts/:postId/comments`.
const router = Router({ mergeParams: true });

router.get(
  "/",
  authenticate,
  validateObjectId("postId"),
  asyncHandler<AuthRequest>(
    commentController.listByPost.bind(commentController)
  )
);

router.post(
  "/",
  authenticate,
  ...csrfProtection,
  validateObjectId("postId"),
  asyncHandler<AuthRequest>(
    commentController.createComment.bind(commentController)
  )
);

export default router;
