import { Router } from "express";
import { authenticate, adminOnly } from "../../middleware/auth";
import { csrfProtection } from "../../middleware/csrf";
import { validateObjectId } from "../../middleware";
import { asyncHandler } from "../../utils";
import { adminServiceController } from "../../controllers/service/admin-service.controller";

const router = Router();

router.use(authenticate, adminOnly);

router.get(
  "/",
  asyncHandler(adminServiceController.list.bind(adminServiceController))
);

router.post(
  "/",
  ...csrfProtection,
  asyncHandler(adminServiceController.create.bind(adminServiceController))
);

router.patch(
  "/:id",
  validateObjectId("id"),
  ...csrfProtection,
  asyncHandler(adminServiceController.update.bind(adminServiceController))
);

router.post(
  "/:id/deprecate",
  validateObjectId("id"),
  ...csrfProtection,
  asyncHandler(adminServiceController.deprecate.bind(adminServiceController))
);

router.post(
  "/:id/reactivate",
  validateObjectId("id"),
  ...csrfProtection,
  asyncHandler(adminServiceController.reactivate.bind(adminServiceController))
);

router.delete(
  "/:id",
  validateObjectId("id"),
  ...csrfProtection,
  asyncHandler(adminServiceController.remove.bind(adminServiceController))
);

export default router;
