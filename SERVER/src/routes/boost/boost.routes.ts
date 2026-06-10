import { Router } from "express";
import { authenticate, workerOnly } from "../../middleware/auth";
import { asyncHandler } from "../../utils";
import { boostController } from "../../controllers/boost/boost.controller";

const router = Router();

router.use(authenticate, workerOnly);

router.post("/attendance", asyncHandler(boostController.checkIn.bind(boostController)));
router.get("/points", asyncHandler(boostController.getPoints.bind(boostController)));
router.post("/activate", asyncHandler(boostController.activateBoost.bind(boostController)));
router.get("/status", asyncHandler(boostController.getBoostStatus.bind(boostController)));

export default router;
