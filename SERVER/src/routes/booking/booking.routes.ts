import { Router } from "express";
import { bookingController } from "../../controllers/booking/booking.controller";
import { adminOnly, authenticate, workerOnly } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { AuthRequest } from "../../middleware/auth";
import { pagination } from "../../middleware";
import { bookingCreateLimiter } from "../../middleware/rateLimiter";
import { Request } from "express";

const router = Router();

// ponytail: quick-booking (guest) tắt — bỏ route POST /quickbook. Bật lại:
// khôi phục route trỏ vào bookingController.createGuestBooking (vẫn còn) +
// UI ở worker-services. Lookup guest booking giữ nguyên cho đơn cũ.

router.get(
  "/lookup",
  asyncHandler<Request>(
    bookingController.lookupGuestBooking.bind(bookingController)
  )
);

router.post(
  "/",
  authenticate,
  bookingCreateLimiter,
  asyncHandler<AuthRequest>(
    bookingController.createBooking.bind(bookingController)
  )
);

router.get(
  "/my",
  authenticate,
  pagination(),
  asyncHandler<AuthRequest>(
    bookingController.getMyBookings.bind(bookingController)
  )
);

router.get(
  "/admin/analytics",
  authenticate,
  adminOnly,
  asyncHandler<AuthRequest>(
    bookingController.getAdminBookingAnalytics.bind(bookingController)
  )
);

router.get(
  "/:id/client-profile",
  authenticate,
  workerOnly,
  asyncHandler<AuthRequest>(
    bookingController.getClientProfileForBooking.bind(bookingController)
  )
);

router.get(
  "/:id",
  authenticate,
  asyncHandler<AuthRequest>(
    bookingController.getBookingById.bind(bookingController)
  )
);

router.patch(
  "/:id/status",
  authenticate,
  asyncHandler<AuthRequest>(
    bookingController.updateBookingStatus.bind(bookingController)
  )
);

router.patch(
  "/:id/cancel",
  authenticate,
  asyncHandler<AuthRequest>(
    bookingController.cancelBooking.bind(bookingController)
  )
);

router.patch(
  "/:id",
  authenticate,
  asyncHandler<AuthRequest>(
    bookingController.updateBooking.bind(bookingController)
  )
);

router.post(
  "/:id/dispute",
  authenticate,
  asyncHandler<AuthRequest>(
    bookingController.createDispute.bind(bookingController)
  )
);

router.patch(
  "/:id/dispute/resolve",
  authenticate,
  asyncHandler<AuthRequest>(
    bookingController.resolveDispute.bind(bookingController)
  )
);

export default router;

