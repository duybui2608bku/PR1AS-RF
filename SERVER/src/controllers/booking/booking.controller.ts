import { Response } from "express";
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
import {
  R,
  validateWithSchema,
  extractUserIdFromRequest,
  AppError,
} from "../../utils";
import { CancelledBy } from "../../constants/booking";
import { userRepository } from "../../repositories/auth/user.repository";
import { Types } from "mongoose";
import { PaginationRequest } from "../../middleware";

export class BookingController {
  async createBooking(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const data = validateWithSchema(
      createBookingSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const result = await bookingService.createBooking(userId, data);
    R.created(res, result, BOOKING_MESSAGES.BOOKING_CREATED, req);
  }

  async getBookingById(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);

    const { id } = req.params;
    const roleInfo = await userRepository.getUserRoleInfoById(userId);
    const result = await bookingService.getBookingById(id, roleInfo);
    R.success(res, result, BOOKING_MESSAGES.BOOKING_FETCHED, req);
  }

  async getMyBookings(req: PaginationRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const query = validateWithSchema(
      getBookingsQuerySchema,
      req.query,
      COMMON_MESSAGES.BAD_REQUEST
    );
    const { page, limit, skip } = req.pagination!;
    const roleInfo = await userRepository.getUserRoleInfoById(userId);
    const { isWorker, isClient } = roleInfo;
    const baseQuery = { ...query, page, limit, skip };
    let result;
    if (isWorker) {
      result = await bookingService.getBookingsByWorker({
        ...baseQuery,
        worker_id: new Types.ObjectId(userId),
      });
    } else if (isClient) {
      result = await bookingService.getBookingsByClient({
        ...baseQuery,
        client_id: new Types.ObjectId(userId),
      });
    } else {
      throw AppError.forbidden();
    }

    R.success(res, result, BOOKING_MESSAGES.BOOKINGS_FETCHED, req);
  }

  // async getAllBookings(req: AuthRequest, res: Response): Promise<void> {
  //   extractUserIdFromRequest(req);
  //   const query = validateWithSchema(
  //     getBookingsQuerySchema,
  //     req.query,
  //     COMMON_MESSAGES.BAD_REQUEST
  //   );

  //   const result = await bookingService.getAllBookings(query);
  //   R.success(res, result, BOOKING_MESSAGES.BOOKINGS_FETCHED, req);
  // }

  async updateBookingStatus(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const { id } = req.params;
    const data = validateWithSchema(
      updateBookingStatusSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const roleInfo = await userRepository.getUserRoleInfoById(userId);

    const result = await bookingService.updateBookingStatus(
      id,
      data.status,
      roleInfo,
      data.worker_response
    );
    R.success(res, result, BOOKING_MESSAGES.BOOKING_STATUS_UPDATED, req);
  }

  async cancelBooking(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);

    const { id } = req.params;
    const data = validateWithSchema(
      cancelBookingSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const roleInfo = await userRepository.getUserRoleInfoById(userId);
    const cancelledBy = data.cancelled_by || CancelledBy.CLIENT;
    const result = await bookingService.cancelBooking(
      id,
      cancelledBy,
      data.reason,
      data.notes || "",
      roleInfo
    );
    R.success(res, result, BOOKING_MESSAGES.BOOKING_CANCELLED, req);
  }

  async updateBooking(req: AuthRequest, res: Response): Promise<void> {
    const userId = extractUserIdFromRequest(req);
    const roleInfo = await userRepository.getUserRoleInfoById(userId);

    const { id } = req.params;
    const data = validateWithSchema(
      updateBookingSchema,
      req.body,
      COMMON_MESSAGES.BAD_REQUEST
    );

    const result = await bookingService.updateBooking(id, data, roleInfo);
    R.success(res, result, BOOKING_MESSAGES.BOOKING_UPDATED, req);
  }
}

export const bookingController = new BookingController();
