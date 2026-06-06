import { Router } from "express";
import { adminOnly, authenticate } from "../../middleware/auth";
import { csrfProtection } from "../../middleware/csrf";
import { validateObjectId } from "../../middleware/validateObjectId";
import { asyncHandler } from "../../utils/asyncHandler";
import { emailCampaignController } from "../../controllers/email-campaign/email-campaign.controller";

const router = Router();

router.use(authenticate, adminOnly);

router.get(
  "/",
  asyncHandler(emailCampaignController.listCampaigns.bind(emailCampaignController))
);

router.post(
  "/",
  ...csrfProtection,
  asyncHandler(emailCampaignController.createCampaign.bind(emailCampaignController))
);

router.get(
  "/:id",
  validateObjectId("id"),
  asyncHandler(emailCampaignController.getCampaign.bind(emailCampaignController))
);

router.patch(
  "/:id",
  ...csrfProtection,
  validateObjectId("id"),
  asyncHandler(emailCampaignController.updateCampaign.bind(emailCampaignController))
);

router.delete(
  "/:id",
  ...csrfProtection,
  validateObjectId("id"),
  asyncHandler(emailCampaignController.deleteCampaign.bind(emailCampaignController))
);

router.post(
  "/:id/send",
  ...csrfProtection,
  validateObjectId("id"),
  asyncHandler(emailCampaignController.sendCampaign.bind(emailCampaignController))
);

router.post(
  "/:id/cancel",
  ...csrfProtection,
  validateObjectId("id"),
  asyncHandler(emailCampaignController.cancelCampaign.bind(emailCampaignController))
);

router.get(
  "/:id/logs",
  validateObjectId("id"),
  asyncHandler(emailCampaignController.listSendLogs.bind(emailCampaignController))
);

export default router;
