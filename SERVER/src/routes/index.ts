import { Router } from "express";
import { authRoutes } from "./auth";
import { userRoutes } from "./user";
import { serviceRoutes } from "./service";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/services", serviceRoutes);

export default router;
