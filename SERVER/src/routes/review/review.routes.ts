import { Router } from "express";
import { reviewController } from "../../controllers/review/review.controller";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { AuthRequest } from "../../middleware/auth";
import { adminOnly } from "../../middleware/auth";

const router = Router();

router.post(
  "/",
  authenticate,
  asyncHandler<AuthRequest>(
    reviewController.createReview.bind(reviewController)
  )
);

router.get(
  "/my",
  authenticate,
  asyncHandler<AuthRequest>(
    reviewController.getMyReviews.bind(reviewController)
  )
);

router.get(
  "/all",
  authenticate,
  adminOnly,
  asyncHandler<AuthRequest>(
    reviewController.getAllReviews.bind(reviewController)
  )
);

router.get(
  "/stats/:workerId",
  authenticate,
  asyncHandler<AuthRequest>(
    reviewController.getReviewStats.bind(reviewController)
  )
);

router.get(
  "/:id",
  authenticate,
  asyncHandler<AuthRequest>(
    reviewController.getReviewById.bind(reviewController)
  )
);

router.patch(
  "/:id",
  authenticate,
  asyncHandler<AuthRequest>(
    reviewController.updateReview.bind(reviewController)
  )
);

router.delete(
  "/:id",
  authenticate,
  asyncHandler<AuthRequest>(
    reviewController.deleteReview.bind(reviewController)
  )
);

router.post(
  "/:id/reply",
  authenticate,
  asyncHandler<AuthRequest>(
    reviewController.replyToReview.bind(reviewController)
  )
);

export default router;
