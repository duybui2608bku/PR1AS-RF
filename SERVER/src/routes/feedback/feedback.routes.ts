import { Router } from "express";
import { feedbackController } from "../../controllers/feedback";
import { adminOnly, authenticate, AuthRequest } from "../../middleware/auth";
import { csrfProtection } from "../../middleware/csrf";
import { validateObjectId } from "../../middleware/validateObjectId";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  ...csrfProtection,
  asyncHandler<AuthRequest>(
    feedbackController.createFeedback.bind(feedbackController)
  )
);

router.get(
  "/mine",
  asyncHandler<AuthRequest>(
    feedbackController.listMyFeedback.bind(feedbackController)
  )
);

router.use("/admin", adminOnly);

router.get(
  "/admin",
  asyncHandler<AuthRequest>(
    feedbackController.listFeedback.bind(feedbackController)
  )
);

router.patch(
  "/admin/:id/status",
  ...csrfProtection,
  validateObjectId("id"),
  asyncHandler<AuthRequest>(
    feedbackController.updateStatus.bind(feedbackController)
  )
);

export default router;
