import { Router } from "express";
import { authRoutes } from "./auth";
import { userRoutes } from "./user";
import { serviceRoutes } from "./service";
import { workerServiceRoutes } from "./worker";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/services", serviceRoutes);
router.use("/worker/services", workerServiceRoutes);

export default router;
