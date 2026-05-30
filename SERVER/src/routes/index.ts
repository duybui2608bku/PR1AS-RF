import { Router } from "express";
import { authRoutes } from "./auth";
import { userRoutes } from "./user";
import { serviceRoutes } from "./service";
import { workerServiceRoutes } from "./worker";
import workerRoutes from "./worker/worker.routes";
import { chatRoutes } from "./chat";
import walletRoutes from "./wallet";
import adminWalletRoutes from "./wallet/admin-wallet.routes";
import dashboardRoutes from "./dashboard/dashboard.routes";
import bookingRoutes from "./booking";
import reviewRoutes from "./review";
import notificationRoutes from "./notification";
import pricingRoutes from "./pricing";
import { postRoutes } from "./post";
import { hashtagRoutes } from "./hashtag";
import { commentRoutes } from "./comment";
import { reactionRoutes } from "./reaction";
import { moderationRoutes } from "./moderation";
import reputationRoutes from "./reputation/reputation.routes";
import reputationConfigRoutes from "./reputation/reputation-config.routes";
import feedbackRoutes from "./feedback";
import { csrfToken } from "../middleware/csrf";
import { CSRF_CONSTANTS } from "../constants/csrf";
import { R } from "../utils/response";

const router = Router();

router.get("/csrf-token", csrfToken, (_req, res) => {
  R.success(
    res,
    { csrfToken: res.getHeader(CSRF_CONSTANTS.HEADER_NAME) },
    "CSRF token issued"
  );
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/services", serviceRoutes);
router.use("/worker/services", workerServiceRoutes);
router.use("/workers", workerRoutes);
router.use("/chat", chatRoutes);
router.use("/wallet", walletRoutes);
router.use("/admin/wallet", adminWalletRoutes);
router.use("/admin/dashboard", dashboardRoutes);
router.use("/bookings", bookingRoutes);
router.use("/reviews", reviewRoutes);
router.use("/notifications", notificationRoutes);
router.use("/pricing", pricingRoutes);
router.use("/posts", postRoutes);
router.use("/comments", commentRoutes);
router.use("/hashtags", hashtagRoutes);
router.use("/reactions", reactionRoutes);
router.use("/moderation", moderationRoutes);
router.use("/reputation", reputationRoutes);
router.use("/admin/reputation-config", reputationConfigRoutes);
router.use("/feedback", feedbackRoutes);

export default router;
