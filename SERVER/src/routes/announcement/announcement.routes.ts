import { Router } from "express";
import { adminOnly, authenticate } from "../../middleware/auth";
import { csrfProtection } from "../../middleware/csrf";
import { validateObjectId } from "../../middleware/validateObjectId";
import { asyncHandler } from "../../utils/asyncHandler";
import { announcementController } from "../../controllers/announcement/announcement.controller";

const publicRouter = Router();
publicRouter.get(
  "/by-placement",
  authenticate,
  asyncHandler(announcementController.getByPlacement.bind(announcementController))
);

const adminRouter = Router();
adminRouter.use(authenticate, adminOnly);

adminRouter.get(
  "/",
  asyncHandler(announcementController.list.bind(announcementController))
);

adminRouter.post(
  "/",
  ...csrfProtection,
  asyncHandler(announcementController.create.bind(announcementController))
);

adminRouter.get(
  "/:id",
  validateObjectId("id"),
  asyncHandler(announcementController.getById.bind(announcementController))
);

adminRouter.patch(
  "/:id",
  ...csrfProtection,
  validateObjectId("id"),
  asyncHandler(announcementController.update.bind(announcementController))
);

adminRouter.delete(
  "/:id",
  ...csrfProtection,
  validateObjectId("id"),
  asyncHandler(announcementController.delete.bind(announcementController))
);

export { publicRouter as announcementPublicRoutes, adminRouter as announcementAdminRoutes };
