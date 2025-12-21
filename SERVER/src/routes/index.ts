import { Router } from "express";
import { authRoutes } from "./auth";
import { serviceRoutes } from "./service";

const router = Router();

router.use("/auth", authRoutes);
router.use("/services", serviceRoutes);

export default router;
