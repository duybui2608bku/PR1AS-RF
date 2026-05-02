import { Router } from "express";
import { hashtagController } from "../../controllers/hashtag/hashtag.controller";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.get(
  "/trending",
  asyncHandler(hashtagController.getTrending.bind(hashtagController))
);

export default router;
