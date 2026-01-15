import { Request, Response } from "express";
import { bookingService } from "../../services/booking/booking.service";
import {
  createBookingSchema,
  updateBookingStatusSchema,
  cancelBookingSchema,
  updateBookingSchema,
  getBookingsQuerySchema,
} from "../../validations/booking/booking.validation";
import { BOOKING_MESSAGES, COMMON_MESSAGES } from "../../constants/messages";
import { AuthRequest } from "../../middleware/auth";
import { AppError, R, validateWithSchema } from "../../utils";
import { CancelledBy } from "../../constants/booking";

export class BookingController {
  async createBooking(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized();
    }

    const data = validateWithSchema(
      createBookingSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const result = await bookingService.createBooking(req.user.sub, data);
    R.created(res, result, BOOKING_MESSAGES.BOOKING_CREATED, req);
  }

  async getBookingById(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized();
    }

    const { id } = req.params;
    const userRoles = req.user.roles || [];
    const result = await bookingService.getBookingById(
      id,
      req.user.sub,
      userRoles
    );
    R.success(res, result, BOOKING_MESSAGES.BOOKING_FETCHED, req);
  }

  async getMyBookings(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized();
    }

    const query = validateWithSchema(
      getBookingsQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const userRoles = req.user.roles || [];
    const isWorker = userRoles.includes("worker");
    const isClient = userRoles.includes("client");

    let result;
    if (isWorker) {
      result = await bookingService.getBookingsByWorker(
        req.user.sub,
        query
      );
    } else if (isClient) {
      result = await bookingService.getBookingsByClient(
        req.user.sub,
        query
      );
    } else {
      throw AppError.forbidden();
    }

    R.success(res, result, BOOKING_MESSAGES.BOOKINGS_FETCHED, req);
  }

  async getAllBookings(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized();
    }

    const userRoles = req.user.roles || [];
    if (!userRoles.includes("admin")) {
      throw AppError.forbidden();
    }

    const query = validateWithSchema(
      getBookingsQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const result = await bookingService.getAllBookings(query);
    R.success(res, result, BOOKING_MESSAGES.BOOKINGS_FETCHED, req);
  }

  async updateBookingStatus(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized();
    }

    const { id } = req.params;
    const data = validateWithSchema(
      updateBookingStatusSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const userRoles = req.user.roles || [];
    const result = await bookingService.updateBookingStatus(
      id,
      data.status,
      req.user.sub,
      userRoles,
      data.worker_response
    );
    R.success(res, result, BOOKING_MESSAGES.BOOKING_STATUS_UPDATED, req);
  }

  async cancelBooking(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized();
    }

    const { id } = req.params;
    const data = validateWithSchema(
      cancelBookingSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const userRoles = req.user.roles || [];
    const cancelledBy = data.cancelled_by || CancelledBy.CLIENT;
    const result = await bookingService.cancelBooking(
      id,
      cancelledBy,
      data.reason,
      data.notes || "",
      req.user.sub,
      userRoles
    );
    R.success(res, result, BOOKING_MESSAGES.BOOKING_CANCELLED, req);
  }

  async updateBooking(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.sub) {
      throw AppError.unauthorized();
    }

    const { id } = req.params;
    const data = validateWithSchema(
      updateBookingSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const userRoles = req.user.roles || [];
    const result = await bookingService.updateBooking(
      id,
      data,
      req.user.sub,
      userRoles
    );
    R.success(res, result, BOOKING_MESSAGES.BOOKING_UPDATED, req);
  }
}

export const bookingController = new BookingController();
