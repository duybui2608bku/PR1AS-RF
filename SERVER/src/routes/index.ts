import { Router } from "express";
import { authRoutes } from "./auth";
import { userRoutes } from "./user";
import { serviceRoutes } from "./service";
import { workerServiceRoutes } from "./worker";
import workerRoutes from "./worker/worker.routes";
import { chatRoutes } from "./chat";
import walletRoutes from "./wallet";
import adminWalletRoutes from "./wallet/admin-wallet.routes";
import bookingRoutes from "./booking";
import reviewRoutes from "./review";
import escrowRoutes from "./escrow";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/services", serviceRoutes);
router.use("/worker/services", workerServiceRoutes);
router.use("/workers", workerRoutes);
router.use("/chat", chatRoutes);
router.use("/wallet", walletRoutes);
router.use("/admin/wallet", adminWalletRoutes);
router.use("/bookings", bookingRoutes);
router.use("/reviews", reviewRoutes);
router.use("/escrows", escrowRoutes);

export default router;
