import { Router } from "express";
import { bookingController } from "../../controllers/booking/booking.controller";
import { authenticate } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { AuthRequest } from "../../middleware/auth";
// import { adminOnly } from "../../middleware/auth";
import { pagination } from "../../middleware";

const router = Router();

router.post(
  "/",
  authenticate,
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

// router.get(
//   "/all",
//   authenticate,
//   adminOnly,
//   asyncHandler<AuthRequest>(
//     bookingController.getAllBookings.bind(bookingController)
//   )
// );

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

export default router;
