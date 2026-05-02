import { Router } from "express";
import { postController } from "../../controllers/post/post.controller";
import { authenticate, AuthRequest } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { csrfProtection } from "../../middleware/csrf";
import { validateObjectId } from "../../middleware/validateObjectId";
import { postCreateLimiter } from "../../middleware/rateLimiter";
import postCommentNestedRoutes from "../comment/post-comment-nested.routes";

const router = Router();

router.post(
  "/",
  authenticate,
  postCreateLimiter,
  ...csrfProtection,
  asyncHandler<AuthRequest>(postController.createPost.bind(postController))
);

router.get(
  "/",
  authenticate,
  asyncHandler<AuthRequest>(postController.listFeed.bind(postController))
);

router.get(
  "/:id",
  authenticate,
  validateObjectId("id"),
  asyncHandler<AuthRequest>(postController.getPostById.bind(postController))
);

router.patch(
  "/:id",
  authenticate,
  ...csrfProtection,
  validateObjectId("id"),
  asyncHandler<AuthRequest>(postController.updatePost.bind(postController))
);

router.delete(
  "/:id",
  authenticate,
  ...csrfProtection,
  validateObjectId("id"),
  asyncHandler<AuthRequest>(postController.deletePost.bind(postController))
);

router.use("/:postId/comments", postCommentNestedRoutes);

export default router;
