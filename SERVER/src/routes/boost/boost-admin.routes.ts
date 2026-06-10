import { Router } from "express";
import { authenticate, adminOnly } from "../../middleware/auth";
import { asyncHandler } from "../../utils";
import { boostAdminController } from "../../controllers/boost/boost-admin.controller";

const router = Router();

router.use(authenticate, adminOnly);

router.get("/config", asyncHandler(boostAdminController.getConfig.bind(boostAdminController)));
router.put("/config", asyncHandler(boostAdminController.updateConfig.bind(boostAdminController)));
router.post("/adjust-points", asyncHandler(boostAdminController.adjustPoints.bind(boostAdminController)));

export default router;
