import { Router } from "express";
import { moderationController } from "../../controllers/moderation";
import { adminOnly, authenticate, AuthRequest } from "../../middleware/auth";
import { csrfProtection } from "../../middleware/csrf";
import { validateObjectId } from "../../middleware/validateObjectId";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.use(authenticate);

router.get(
  "/blocks",
  asyncHandler<AuthRequest>(
    moderationController.listBlocks.bind(moderationController)
  )
);

router.post(
  "/blocks",
  ...csrfProtection,
  asyncHandler<AuthRequest>(
    moderationController.blockUser.bind(moderationController)
  )
);

router.delete(
  "/blocks/:blocked_user_id",
  ...csrfProtection,
  validateObjectId("blocked_user_id"),
  asyncHandler<AuthRequest>(
    moderationController.unblockUser.bind(moderationController)
  )
);

router.post(
  "/reports/post",
  ...csrfProtection,
  asyncHandler<AuthRequest>(
    moderationController.reportPost.bind(moderationController)
  )
);

router.post(
  "/reports/worker",
  ...csrfProtection,
  asyncHandler<AuthRequest>(
    moderationController.reportWorker.bind(moderationController)
  )
);

router.use("/admin", adminOnly);

router.get(
  "/admin/reports",
  asyncHandler<AuthRequest>(
    moderationController.listReports.bind(moderationController)
  )
);

router.patch(
  "/admin/reports/:id/status",
  ...csrfProtection,
  validateObjectId("id"),
  asyncHandler<AuthRequest>(
    moderationController.updateReportStatus.bind(moderationController)
  )
);

router.get(
  "/admin/restrictions",
  asyncHandler<AuthRequest>(
    moderationController.listRestrictions.bind(moderationController)
  )
);

router.post(
  "/admin/restrictions",
  ...csrfProtection,
  asyncHandler<AuthRequest>(
    moderationController.createRestriction.bind(moderationController)
  )
);

router.patch(
  "/admin/restrictions/:id/revoke",
  ...csrfProtection,
  validateObjectId("id"),
  asyncHandler<AuthRequest>(
    moderationController.revokeRestriction.bind(moderationController)
  )
);

router.delete(
  "/admin/posts/:id",
  ...csrfProtection,
  validateObjectId("id"),
  asyncHandler<AuthRequest>(
    moderationController.deletePostAsAdmin.bind(moderationController)
  )
);

export default router;
